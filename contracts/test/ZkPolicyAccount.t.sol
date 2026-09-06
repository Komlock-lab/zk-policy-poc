// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EntryPoint} from "@account-abstraction/contracts/core/EntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {ZkPolicyAccount} from "../src/ZkPolicyAccount.sol";
import {ISpendLimitVerifier} from "../src/interfaces/ISpendLimitVerifier.sol";

interface Vm {
    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function addr(uint256 privateKey) external returns (address);
    function assume(bool condition) external;
    function deal(address account, uint256 newBalance) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
    function expectRevert() external;
    function expectRevert(bytes calldata revertData) external;
    function getRecordedLogs() external returns (Log[] memory);
    function prank(address msgSender) external;
    function recordLogs() external;
    function warp(uint256 timestamp) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
}

contract MockSpendLimitVerifier is ISpendLimitVerifier {
    bool public result = true;
    bytes32 public expectedValue;
    bytes32 public expectedCommitment;
    bytes32 public expectedInputsHash;

    function configureInputs(bytes32[] calldata inputs) external {
        expectedInputsHash = keccak256(abi.encode(inputs));
    }

    function configure(bool result_, bytes32 expectedValue_, bytes32 expectedCommitment_) external {
        result = result_;
        expectedValue = expectedValue_;
        expectedCommitment = expectedCommitment_;
    }

    function verify(bytes calldata, bytes32[] calldata publicInputs) external view returns (bool) {
        return result && publicInputs.length == 15 && publicInputs[7] == expectedValue
            && publicInputs[3] == expectedCommitment
            && (expectedInputsHash == 0 || keccak256(abi.encode(publicInputs)) == expectedInputsHash);
    }
}

contract RejectEther {
    receive() external payable {
        revert();
    }
}

contract ZkPolicyAccountTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 private constant OWNER_PRIVATE_KEY = 0xA11CE;
    bytes32 private constant POLICY_COMMITMENT = bytes32(uint256(1234));
    bytes private constant PROOF = hex"1234";

    event PaymentExecuted(address indexed recipient, uint256 value);
    event PolicyCommitmentUpdated(bytes32 previousCommitment, bytes32 newCommitment);

    address private owner;
    EntryPoint private entryPoint;
    MockSpendLimitVerifier private verifier;
    ZkPolicyAccount private account;

    function setUp() public {
        owner = vm.addr(OWNER_PRIVATE_KEY);
        entryPoint = new EntryPoint();
        verifier = new MockSpendLimitVerifier();
        account = new ZkPolicyAccount(owner, verifier, entryPoint);
        vm.prank(owner);
        account.updatePolicyCommitment(POLICY_COMMITMENT);
    }

    function testConstructorStoresDependencies() public view {
        require(account.owner() == owner, "owner mismatch");
        require(address(account.verifier()) == address(verifier), "verifier mismatch");
        require(address(account.entryPoint()) == address(entryPoint), "entrypoint mismatch");
    }

    function testValidateUserOpAcceptsOwnerSignatureAndPaysPrefund() public {
        PackedUserOperation memory userOp = _userOp(hex"");
        bytes32 userOpHash = keccak256("owner user operation");
        userOp.signature = _sign(userOpHash, OWNER_PRIVATE_KEY);
        uint256 prefund = 0.1 ether;
        vm.deal(address(account), prefund);
        vm.prank(address(entryPoint));

        uint256 validationData = account.validateUserOp(userOp, userOpHash, prefund);

        require(validationData == 0, "signature should succeed");
        require(entryPoint.balanceOf(address(account)) == prefund, "prefund mismatch");
    }

    function testValidateUserOpReturnsFailureForWrongSigner() public {
        PackedUserOperation memory userOp = _userOp(hex"");
        bytes32 userOpHash = keccak256("wrong signer");
        userOp.signature = _sign(userOpHash, 0xB0B);
        vm.prank(address(entryPoint));

        uint256 validationData = account.validateUserOp(userOp, userOpHash, 0);

        require(validationData == 1, "signature should fail");
    }

    function testValidateUserOpReturnsFailureForMalformedSignature() public {
        PackedUserOperation memory userOp = _userOp(hex"");
        userOp.signature = hex"1234";
        vm.prank(address(entryPoint));

        uint256 validationData = account.validateUserOp(userOp, keccak256("malformed"), 0);

        require(validationData == 1, "malformed signature should fail");
    }

    function testValidateUserOpRejectsNonEntryPointCaller() public {
        PackedUserOperation memory userOp = _userOp(hex"");
        address caller = address(0xBAD);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.Unauthorized.selector, caller));
        vm.prank(caller);

        account.validateUserOp(userOp, bytes32(0), 0);
    }

    function testExecuteTransfersNativeToken() public {
        address payable recipient = payable(address(0xBEEF));
        uint256 value = 0.01 ether;
        vm.deal(address(account), value);
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);
        vm.prank(owner);

        account.execute(recipient, value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF);

        require(recipient.balance == value, "recipient balance mismatch");
        require(address(account).balance == 0, "account balance mismatch");
    }

    function testExecuteUserOpTransfersNativeToken() public {
        address payable recipient = payable(address(0xBEEF));
        uint256 value = 0.01 ether;
        vm.deal(address(account), value);
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);
        vm.expectEmit(true, false, false, true);
        emit PaymentExecuted(recipient, value);
        vm.prank(address(entryPoint));

        account.executeUserOp(recipient, value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF);

        require(recipient.balance == value, "recipient balance mismatch");
    }

    function testEntryPointHandleOpsValidatesAndExecutesPayment() public {
        address payable recipient = payable(address(0xCAFE));
        uint256 value = 0.01 ether;
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);
        vm.deal(address(account), 1 ether);
        PackedUserOperation memory userOp = _userOp(
            abi.encodeCall(
                ZkPolicyAccount.executeUserOp,
                (recipient, value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF)
            )
        );
        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);
        userOp.signature = _sign(userOpHash, OWNER_PRIVATE_KEY);
        PackedUserOperation[] memory userOps = new PackedUserOperation[](1);
        userOps[0] = userOp;
        vm.recordLogs();

        entryPoint.handleOps(userOps, payable(address(0xB0B)));

        require(recipient.balance == value, "recipient balance mismatch");
        require(entryPoint.getNonce(address(account), 0) == 1, "nonce mismatch");
        require(_hasPaymentLog(vm.getRecordedLogs(), recipient, value), "payment event missing");
    }

    function testEntryPointHandleOpsRejectsWrongSignerWithoutConsumingNonce() public {
        address payable recipient = payable(address(0xCAFE));
        uint256 value = 0.01 ether;
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);
        vm.deal(address(account), 1 ether);
        PackedUserOperation memory userOp = _userOp(
            abi.encodeCall(
                ZkPolicyAccount.executeUserOp,
                (recipient, value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF)
            )
        );
        userOp.signature = _sign(entryPoint.getUserOpHash(userOp), 0xB0B);
        PackedUserOperation[] memory userOps = new PackedUserOperation[](1);
        userOps[0] = userOp;
        vm.expectRevert();

        entryPoint.handleOps(userOps, payable(address(0xB0B)));

        require(recipient.balance == 0, "recipient balance changed");
        require(entryPoint.getNonce(address(account), 0) == 0, "nonce changed");
    }

    function testRejectsUnauthorizedCaller() public {
        address caller = address(0xBAD);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.Unauthorized.selector, caller));
        vm.prank(caller);

        account.execute(payable(address(0xBEEF)), 1, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF);
    }

    function testExecuteUserOpRejectsNonEntryPointCaller() public {
        address caller = address(0xBAD);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.Unauthorized.selector, caller));
        vm.prank(caller);

        account.executeUserOp(
            payable(address(0xBEEF)), 1, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF
        );
    }

    function testUpdateRejectsCommitmentOutsideField() public {
        bytes32 invalidCommitment = bytes32(type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.PolicyCommitmentOutOfRange.selector, invalidCommitment));
        vm.prank(owner);

        account.updatePolicyCommitment(invalidCommitment);
    }

    function testConstructorRejectsZeroOwner() public {
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidOwner.selector));

        new ZkPolicyAccount(address(0), verifier, entryPoint);
    }

    function testConstructorRejectsVerifierWithoutCode() public {
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidVerifier.selector));

        new ZkPolicyAccount(owner, ISpendLimitVerifier(address(0xBEEF)), entryPoint);
    }

    function testConstructorRejectsEntryPointWithoutCode() public {
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidEntryPoint.selector));

        new ZkPolicyAccount(owner, verifier, EntryPoint(payable(address(0xBEEF))));
    }

    function testRejectsExecuteBeforePolicyConfigured() public {
        ZkPolicyAccount unconfigured = new ZkPolicyAccount(owner, verifier, entryPoint);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.PolicyNotConfigured.selector));
        vm.prank(owner);

        unconfigured.execute(payable(address(0xBEEF)), 1, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF);
    }

    function testRejectsUnauthorizedPolicyUpdate() public {
        address caller = address(0xBAD);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.Unauthorized.selector, caller));
        vm.prank(caller);

        account.updatePolicyCommitment(bytes32(uint256(5678)));
    }

    function testUpdatesPolicyCommitment() public {
        bytes32 newCommitment = bytes32(uint256(5678));
        vm.expectEmit(false, false, false, true);
        emit PolicyCommitmentUpdated(POLICY_COMMITMENT, newCommitment);
        vm.prank(owner);

        account.updatePolicyCommitment(newCommitment);

        require(account.policyConfigured(), "policy should be configured");
        require(account.policyCommitment() == newCommitment, "commitment mismatch");
    }

    function testFuzzAcceptsCommitmentInsideField(uint256 commitment) public {
        vm.assume(commitment < 21888242871839275222246405745257275088548364400416034343698204186575808495617);
        vm.prank(owner);

        account.updatePolicyCommitment(bytes32(commitment));

        require(account.policyCommitment() == bytes32(commitment), "commitment mismatch");
    }

    function testRejectsZeroRecipient() public {
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidRecipient.selector));
        vm.prank(owner);

        account.execute(payable(address(0)), 1, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF);
    }

    function testRejectsAmountOutsideU128() public {
        uint256 value = uint256(type(uint128).max) + 1;
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.AmountOutOfRange.selector, value));
        vm.prank(owner);

        account.execute(payable(address(0xBEEF)), value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF);
    }

    function testRejectsInvalidProof() public {
        uint256 value = 1;
        verifier.configure(false, bytes32(value), POLICY_COMMITMENT);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidProof.selector));
        vm.prank(owner);

        account.execute(payable(address(0xBEEF)), value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF);
    }

    function testRejectsMismatchedPublicValue() public {
        uint256 value = 1;
        verifier.configure(true, bytes32(value + 1), POLICY_COMMITMENT);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidProof.selector));
        vm.prank(owner);

        account.execute(payable(address(0xBEEF)), value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF);
    }

    function testExecuteUserOpRejectsStaleCommitment() public {
        uint256 value = 1;
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);
        vm.prank(owner);
        account.updatePolicyCommitment(bytes32(uint256(5678)));
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidProof.selector));
        vm.prank(address(entryPoint));

        account.executeUserOp(
            payable(address(0xBEEF)), value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF
        );
    }

    function testExecuteUserOpRejectsMismatchedPublicValue() public {
        uint256 value = 1;
        verifier.configure(true, bytes32(value + 1), POLICY_COMMITMENT);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidProof.selector));
        vm.prank(address(entryPoint));

        account.executeUserOp(
            payable(address(0xBEEF)), value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF
        );
    }

    function testExecuteUserOpRejectsFailedTransfer() public {
        uint256 value = 1;
        RejectEther recipient = new RejectEther();
        vm.deal(address(account), value);
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);
        uint256 accountBalanceBefore = address(account).balance;
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.TransferFailed.selector));
        vm.prank(address(entryPoint));

        account.executeUserOp(
            payable(address(recipient)), value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF
        );

        require(address(account).balance == accountBalanceBefore, "account balance changed");
        require(address(recipient).balance == 0, "recipient balance changed");
    }

    function testRejectsFailedTransfer() public {
        uint256 value = 1;
        RejectEther recipient = new RejectEther();
        vm.deal(address(account), value);
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);
        uint256 accountBalanceBefore = address(account).balance;
        uint256 recipientBalanceBefore = address(recipient).balance;
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.TransferFailed.selector));
        vm.prank(owner);

        account.execute(
            payable(address(recipient)), value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF
        );

        require(address(account).balance == accountBalanceBefore, "account balance changed");
        require(address(recipient).balance == recipientBalanceBefore, "recipient balance changed");
    }

    function testFuzzExecuteUsesActualValue(uint128 value) public {
        vm.assume(value > 0);
        address payable recipient = payable(address(0xCAFE));
        vm.deal(address(account), value);
        verifier.configure(true, bytes32(uint256(value)), POLICY_COMMITMENT);
        vm.prank(owner);

        account.execute(recipient, value, uint64(block.timestamp), uint64(block.timestamp + 300), PROOF);

        require(recipient.balance == value, "recipient balance mismatch");
    }

    function testExpiryPaymentBindsAllPublicInputsAtDeadline() public {
        uint64 issuedAt = 172800;
        uint64 validUntil = issuedAt + 300;
        vm.warp(validUntil);
        address payable recipient = payable(address(0xCAFE));
        uint256 value = 0.01 ether;
        vm.deal(address(account), value);
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);
        bytes32[] memory inputs = new bytes32[](15);
        inputs[0] = bytes32(uint256(2));
        inputs[1] = bytes32(block.chainid);
        inputs[2] = bytes32(uint256(uint160(address(account))));
        inputs[3] = POLICY_COMMITMENT;
        inputs[5] = bytes32(uint256(uint160(address(recipient))));
        inputs[7] = bytes32(value);
        inputs[8] = bytes32(uint256(uint160(address(recipient))));
        inputs[11] = bytes32(uint256(issuedAt));
        inputs[12] = bytes32(uint256(validUntil));
        inputs[13] = bytes32(uint256(2));
        verifier.configureInputs(inputs);
        vm.prank(owner);

        account.execute(recipient, value, issuedAt, validUntil, PROOF);

        require(recipient.balance == value, "deadline payment balance mismatch");
    }

    function _userOp(bytes memory callData) private view returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: address(account),
            nonce: entryPoint.getNonce(address(account), 0),
            initCode: hex"",
            callData: callData,
            accountGasLimits: bytes32((uint256(500_000) << 128) | uint256(500_000)),
            preVerificationGas: 100_000,
            gasFees: bytes32((uint256(1 gwei) << 128) | uint256(2 gwei)),
            paymasterAndData: hex"",
            signature: hex""
        });
    }

    function _sign(bytes32 digest, uint256 privateKey) private returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _hasPaymentLog(Vm.Log[] memory logs, address recipient, uint256 value) private view returns (bool) {
        bytes32 signature = keccak256("PaymentExecuted(address,uint256)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (
                logs[i].emitter == address(account) && logs[i].topics.length == 2 && logs[i].topics[0] == signature
                    && logs[i].topics[1] == bytes32(uint256(uint160(address(recipient))))
                    && abi.decode(logs[i].data, (uint256)) == value
            ) return true;
        }
        return false;
    }
}
