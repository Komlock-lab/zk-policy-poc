// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ISpendLimitVerifier} from "./interfaces/ISpendLimitVerifier.sol";

contract ZkPolicyAccount {
    error AmountOutOfRange(uint256 value);
    error InvalidOwner();
    error InvalidProof();
    error InvalidRecipient();
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
    bytes32 public policyCommitment;
    bool public policyConfigured;

    constructor(address owner_, ISpendLimitVerifier verifier_) {
        if (owner_ == address(0)) revert InvalidOwner();
        if (address(verifier_).code.length == 0) revert InvalidVerifier();

        owner = owner_;
        verifier = verifier_;
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
        if (!policyConfigured) revert PolicyNotConfigured();
        if (recipient == address(0)) revert InvalidRecipient();
        if (value > U128_MAX) revert AmountOutOfRange(value);

        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(value);
        publicInputs[1] = policyCommitment;

        if (!verifier.verify(proof, publicInputs)) revert InvalidProof();

        (bool success,) = recipient.call{value: value}("");
        if (!success) revert TransferFailed();

        emit PaymentExecuted(recipient, value);
    }
}
