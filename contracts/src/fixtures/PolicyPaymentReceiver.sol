// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPolicyPaymentReceiver} from "../interfaces/IPolicyPaymentReceiver.sol";

contract PolicyPaymentReceiver is IPolicyPaymentReceiver {
    event InvoicePaid(bytes32 indexed invoiceId, address indexed payer, uint256 value);

    function pay(bytes32 invoiceId) external payable {
        emit InvoicePaid(invoiceId, msg.sender, msg.value);
    }
}
