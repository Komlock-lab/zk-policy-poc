// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IPolicyPaymentReceiver {
    function pay(bytes32 invoiceId) external payable;
}
