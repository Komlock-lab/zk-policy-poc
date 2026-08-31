// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ZkPolicyAccount} from "../src/ZkPolicyAccount.sol";
import {ISpendLimitVerifier} from "../src/interfaces/ISpendLimitVerifier.sol";

interface Vm {
    function assume(bool condition) external;
    function deal(address account, uint256 newBalance) external;
    function expectRevert(bytes calldata revertData) external;
    function prank(address msgSender) external;
}

contract MockSpendLimitVerifier is ISpendLimitVerifier {
    bool public result = true;
    bytes32 public expectedValue;
    bytes32 public expectedCommitment;

    function configure(bool result_, bytes32 expectedValue_, bytes32 expectedCommitment_) external {
        result = result_;
        expectedValue = expectedValue_;
        expectedCommitment = expectedCommitment_;
    }

    function verify(bytes calldata, bytes32[] calldata publicInputs) external view returns (bool) {
        return
            result && publicInputs.length == 2 && publicInputs[0] == expectedValue
                && publicInputs[1] == expectedCommitment;
    }
}

contract RejectEther {
    receive() external payable {
        revert();
    }
}

contract ZkPolicyAccountTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    bytes32 private constant POLICY_COMMITMENT = bytes32(uint256(1234));
    bytes private constant PROOF = hex"1234";

    MockSpendLimitVerifier private verifier;
    ZkPolicyAccount private account;

    function setUp() public {
        verifier = new MockSpendLimitVerifier();
        account = new ZkPolicyAccount(address(this), verifier, POLICY_COMMITMENT);
    }

    function testExecuteTransfersNativeToken() public {
        address payable recipient = payable(address(0xBEEF));
        uint256 value = 0.01 ether;
        vm.deal(address(account), value);
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);

        account.execute(recipient, value, PROOF);

        require(recipient.balance == value, "recipient balance mismatch");
        require(address(account).balance == 0, "account balance mismatch");
    }

    function testRejectsUnauthorizedCaller() public {
        address caller = address(0xBAD);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.Unauthorized.selector, caller));
        vm.prank(caller);

        account.execute(payable(address(0xBEEF)), 1, PROOF);
    }

    function testConstructorRejectsCommitmentOutsideField() public {
        bytes32 invalidCommitment = bytes32(type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.PolicyCommitmentOutOfRange.selector, invalidCommitment));

        new ZkPolicyAccount(address(this), verifier, invalidCommitment);
    }

    function testConstructorRejectsZeroOwner() public {
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidOwner.selector));

        new ZkPolicyAccount(address(0), verifier, POLICY_COMMITMENT);
    }

    function testConstructorRejectsVerifierWithoutCode() public {
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidVerifier.selector));

        new ZkPolicyAccount(address(this), ISpendLimitVerifier(address(0xBEEF)), POLICY_COMMITMENT);
    }

    function testRejectsZeroRecipient() public {
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidRecipient.selector));

        account.execute(payable(address(0)), 1, PROOF);
    }

    function testRejectsAmountOutsideU128() public {
        uint256 value = uint256(type(uint128).max) + 1;
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.AmountOutOfRange.selector, value));

        account.execute(payable(address(0xBEEF)), value, PROOF);
    }

    function testRejectsInvalidProof() public {
        uint256 value = 1;
        verifier.configure(false, bytes32(value), POLICY_COMMITMENT);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidProof.selector));

        account.execute(payable(address(0xBEEF)), value, PROOF);
    }

    function testRejectsMismatchedPublicValue() public {
        uint256 value = 1;
        verifier.configure(true, bytes32(value + 1), POLICY_COMMITMENT);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.InvalidProof.selector));

        account.execute(payable(address(0xBEEF)), value, PROOF);
    }

    function testRejectsFailedTransfer() public {
        uint256 value = 1;
        RejectEther recipient = new RejectEther();
        vm.deal(address(account), value);
        verifier.configure(true, bytes32(value), POLICY_COMMITMENT);
        vm.expectRevert(abi.encodeWithSelector(ZkPolicyAccount.TransferFailed.selector));

        account.execute(payable(address(recipient)), value, PROOF);
    }

    function testFuzzExecuteUsesActualValue(uint96 value) public {
        vm.assume(value > 0);
        address payable recipient = payable(address(0xCAFE));
        vm.deal(address(account), value);
        verifier.configure(true, bytes32(uint256(value)), POLICY_COMMITMENT);

        account.execute(recipient, value, PROOF);

        require(recipient.balance == value, "recipient balance mismatch");
    }
}
