import {ethers} from "hardhat";
import * as dotenv from "dotenv";
import {Lottery, LotteryToken, LotteryToken__factory, Lottery__factory} from "../typechain-types";

dotenv.config();

const BET_PRICE = 1;
const BET_FEE = 0.2;
const TOKEN_RATIO = 10000;

async function main() {
    const provider = ethers.getDefaultProvider("goerli");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "", provider);
    const voter = wallet.connect(provider);

    const balanceBN = await voter.getBalance();
    console.log("connected to account of address: " + voter.address);
    console.log("balance: " + balanceBN.toString() + " wei");


    let lotteryContract : Lottery;
    const lotteryContractFactory = new Lottery__factory(voter);
    lotteryContract = await lotteryContractFactory.deploy("LotteryToken", "LTX", TOKEN_RATIO, ethers.utils.parseEther(BET_PRICE.toFixed(18)), ethers.utils.parseEther(BET_FEE.toFixed(18)));
    await lotteryContract.deployed();


    let lotteryToken: LotteryToken;
    console.log("contract deployed at address: " + lotteryContract.address);
    const tokenAddress = await lotteryContract.paymentToken();
    const tokenFactory = await LotteryToken__factory.connect(tokenAddress, voter);
    lotteryToken = tokenFactory.attach(tokenAddress);

    const balance = await lotteryToken.balanceOf(voter.address);
    console.log("balance of token: " + balance.toString());
}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
