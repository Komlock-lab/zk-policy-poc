// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IAccount} from "@account-abstraction/contracts/interfaces/IAccount.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {
    PackedUserOperation
} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {
    SIG_VALIDATION_FAILED,
    SIG_VALIDATION_SUCCESS
} from "@account-abstraction/contracts/core/Helpers.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ISpendLimitVerifier} from "./interfaces/ISpendLimitVerifier.sol";

contract ZkPolicyAccount is IAccount {
    error AmountOutOfRange(uint256 value);
    error InvalidOwner();
    error InvalidProof();
    error InvalidRecipient();
    error InvalidEntryPoint();
    error InvalidVerifier();
    error PolicyNotConfigured();
    error PolicyCommitmentOutOfRange(bytes32 policyCommitment);
    error TransferFailed();
    error Unauthorized(address caller);

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

    function execute(address payable recipient, uint256 value, bytes calldata proof) external {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        _executePolicyPayment(recipient, value, proof);
    }

    function executeUserOp(address payable recipient, uint256 value, bytes calldata proof)
        external
    {
        if (msg.sender != address(entryPoint)) revert Unauthorized(msg.sender);
        _executePolicyPayment(recipient, value, proof);
    }

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        if (msg.sender != address(entryPoint)) {
            revert Unauthorized(msg.sender);
        }

        (address recovered, ECDSA.RecoverError recoverError,) =
            ECDSA.tryRecover(userOpHash, userOp.signature);
        validationData = recoverError == ECDSA.RecoverError.NoError && recovered == owner
            ? SIG_VALIDATION_SUCCESS
            : SIG_VALIDATION_FAILED;

        if (missingAccountFunds != 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            // EntryPoint verifies the account deposit after validation and reports any shortfall.
            success;
        }
    }

    function _executePolicyPayment(address payable recipient, uint256 value, bytes calldata proof)
        internal
    {
        if (!policyConfigured) revert PolicyNotConfigured();
        if (recipient == address(0)) revert InvalidRecipient();
        if (value > U128_MAX) revert AmountOutOfRange(value);

        bytes32[] memory publicInputs = new bytes32[](3);
        publicInputs[0] = bytes32(value);
        publicInputs[1] = bytes32(uint256(uint160(recipient)));
        publicInputs[2] = policyCommitment;

        if (!verifier.verify(proof, publicInputs)) revert InvalidProof();

        (bool success,) = recipient.call{value: value}("");
        if (!success) revert TransferFailed();

        emit PaymentExecuted(recipient, value);
    }
}
