// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IAccount} from "@account-abstraction/contracts/interfaces/IAccount.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_FAILED, SIG_VALIDATION_SUCCESS} from "@account-abstraction/contracts/core/Helpers.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IPolicyPaymentReceiver} from "./interfaces/IPolicyPaymentReceiver.sol";
import {ISpendLimitVerifier} from "./interfaces/ISpendLimitVerifier.sol";

contract ZkPolicyAccount is IAccount {
    using SafeERC20 for IERC20;
    error AmountOutOfRange(uint256 value);
    error InvalidOwner();
    error InvalidToken();
    error InvalidPaymentTime();
    error InvalidProof();
    error InvalidRecipient();
    error InvalidEntryPoint();
    error InvalidVerifier();
    error PolicyNotConfigured();
    error PolicyCommitmentOutOfRange(bytes32 policyCommitment);
    error TransferFailed();
    error Unauthorized(address caller);

    event ContractPaymentExecuted(address indexed recipient, bytes32 indexed invoiceId, uint256 value);
    event ERC20PaymentExecuted(address indexed token, address indexed recipient, uint256 amount);
    event PaymentExecuted(address indexed recipient, uint256 value);
    event PolicyCommitmentUpdated(bytes32 previousCommitment, bytes32 newCommitment);

    uint256 private constant U128_MAX = type(uint128).max;
    uint256 private constant BN254_FIELD_MODULUS =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    address public immutable owner;
    ISpendLimitVerifier public immutable verifier;
    IEntryPoint public immutable entryPoint;
    bytes32 public policyCommitment;
    bool public policyConfigured;

    struct DailySpend {
        uint64 lastDay;
        uint128 spent;
    }
    mapping(address asset => DailySpend) private dailySpend;

    function getDailySpend(address asset) public view returns (uint64 dayId, uint128 spentBefore) {
        dayId = uint64(block.timestamp / 86400);
        DailySpend memory previous = dailySpend[asset];
        spentBefore = previous.lastDay == dayId ? previous.spent : 0;
    }

    constructor(address owner_, ISpendLimitVerifier verifier_, IEntryPoint entryPoint_) {
        if (owner_ == address(0)) revert InvalidOwner();
        if (address(verifier_).code.length == 0) revert InvalidVerifier();
        if (address(entryPoint_).code.length == 0) revert InvalidEntryPoint();

        owner = owner_;
        verifier = verifier_;
        entryPoint = entryPoint_;
    }

    receive() external payable {}

    function updatePolicyCommitment(bytes32 newCommitment) external {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        if (uint256(newCommitment) >= BN254_FIELD_MODULUS) {
            revert PolicyCommitmentOutOfRange(newCommitment);
        }

        bytes32 previousCommitment = policyCommitment;
        policyCommitment = newCommitment;
        policyConfigured = true;

        emit PolicyCommitmentUpdated(previousCommitment, newCommitment);
    }

    function execute(address payable recipient, uint256 value, uint64 issuedAt, uint64 validUntil, bytes calldata proof)
        external
    {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        _executePolicyPayment(0, address(0), recipient, value, issuedAt, validUntil, bytes32(0), proof);
    }

    function executeUserOp(
        address payable recipient,
        uint256 value,
        uint64 issuedAt,
        uint64 validUntil,
        bytes calldata proof
    ) external {
        if (msg.sender != address(entryPoint)) revert Unauthorized(msg.sender);
        _executePolicyPayment(0, address(0), recipient, value, issuedAt, validUntil, bytes32(0), proof);
    }

    function executeERC20(
        address token,
        address recipient,
        uint256 amount,
        uint64 issuedAt,
        uint64 validUntil,
        bytes calldata proof
    ) external {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        _executePolicyPayment(1, token, payable(recipient), amount, issuedAt, validUntil, bytes32(0), proof);
    }

    function executeERC20UserOp(
        address token,
        address recipient,
        uint256 amount,
        uint64 issuedAt,
        uint64 validUntil,
        bytes calldata proof
    ) external {
        if (msg.sender != address(entryPoint)) revert Unauthorized(msg.sender);
        _executePolicyPayment(1, token, payable(recipient), amount, issuedAt, validUntil, bytes32(0), proof);
    }

    function executeContract(
        address recipient,
        bytes32 invoiceId,
        uint256 value,
        uint64 issuedAt,
        uint64 validUntil,
        bytes calldata proof
    ) external {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        _executePolicyPayment(2, address(0), payable(recipient), value, issuedAt, validUntil, invoiceId, proof);
    }

    function executeContractUserOp(
        address recipient,
        bytes32 invoiceId,
        uint256 value,
        uint64 issuedAt,
        uint64 validUntil,
        bytes calldata proof
    ) external {
        if (msg.sender != address(entryPoint)) revert Unauthorized(msg.sender);
        _executePolicyPayment(2, address(0), payable(recipient), value, issuedAt, validUntil, invoiceId, proof);
    }

    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        override
        returns (uint256 validationData)
    {
        if (msg.sender != address(entryPoint)) {
            revert Unauthorized(msg.sender);
        }

        (address recovered, ECDSA.RecoverError recoverError,) = ECDSA.tryRecover(userOpHash, userOp.signature);
        validationData = recoverError == ECDSA.RecoverError.NoError && recovered == owner
            ? SIG_VALIDATION_SUCCESS
            : SIG_VALIDATION_FAILED;

        if (missingAccountFunds != 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            // EntryPoint verifies the account deposit after validation and reports any shortfall.
            success;
        }
    }

    function _executePolicyPayment(
        uint8 kind,
        address asset,
        address payable recipient,
        uint256 value,
        uint64 issuedAt,
        uint64 validUntil,
        bytes32 invoiceId,
        bytes calldata proof
    ) internal {
        if (!policyConfigured) revert PolicyNotConfigured();
        if (recipient == address(0) || (kind == 2 && recipient.code.length == 0)) revert InvalidRecipient();
        if (kind == 1 && asset.code.length == 0) revert InvalidToken();
        if (value > U128_MAX) revert AmountOutOfRange(value);

        if (block.timestamp < issuedAt || block.timestamp > validUntil) revert InvalidPaymentTime();
        (uint64 dayId, uint128 spentBefore) = getDailySpend(asset);
        bytes32[] memory publicInputs = new bytes32[](15);
        publicInputs[0] = bytes32(uint256(2));
        publicInputs[1] = bytes32(block.chainid);
        publicInputs[2] = bytes32(uint256(uint160(address(this))));
        publicInputs[3] = policyCommitment;
        publicInputs[4] = bytes32(uint256(kind));
        publicInputs[6] = bytes32(uint256(uint160(asset)));
        publicInputs[5] = bytes32(uint256(uint160(address(recipient))));
        publicInputs[7] = bytes32(value);
        publicInputs[8] = bytes32(uint256(uint160(kind == 1 ? asset : address(recipient))));
        publicInputs[9] = bytes32(uint256(invoiceId) >> 128);
        publicInputs[10] = bytes32(uint256(uint128(uint256(invoiceId))));
        publicInputs[11] = bytes32(uint256(issuedAt));
        publicInputs[12] = bytes32(uint256(validUntil));
        publicInputs[13] = bytes32(uint256(dayId));
        publicInputs[14] = bytes32(uint256(spentBefore));
        if (!verifier.verify(proof, publicInputs)) revert InvalidProof();
        dailySpend[asset] = DailySpend(dayId, spentBefore + uint128(value));

        if (kind == 1) {
            IERC20(asset).safeTransfer(recipient, value);
            emit ERC20PaymentExecuted(asset, recipient, value);
        } else if (kind == 2) {
            (bool success,) = recipient.call{value: value}(abi.encodeCall(IPolicyPaymentReceiver.pay, (invoiceId)));
            if (!success) revert TransferFailed();
            emit ContractPaymentExecuted(recipient, invoiceId, value);
        } else {
            (bool success,) = recipient.call{value: value}("");
            if (!success) revert TransferFailed();
            emit PaymentExecuted(recipient, value);
        }
    }
}
