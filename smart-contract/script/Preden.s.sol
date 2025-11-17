// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Preden} from "../src/Preden.sol";

contract PredenScript is Script {
    Preden public preden;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        preden = new Preden(100);

        console.log("Preden deployed at: ", address(preden));
        
        preden.addCategory("Politics", "Events on politics");
        preden.addCategory("Sports", "Events on sports");
        preden.addCategory("Entertainments", "Events on entertainments");
        preden.addCategory("Crypto", "Events on crypto");
        preden.addToken(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
        
        vm.stopBroadcast();
    }
}
