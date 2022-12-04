import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ethers } from 'ethers';
import lotteryJson from '../assets/Lottery.json';
import lotteryTokenJson from '../assets/LotteryToken.json';

const TOKEN_RATIO = 10000;

@Component({ selector: 'app-root', templateUrl: './app.component.html', styleUrls: ['./app.component.scss'] })
export class AppComponent {
    provider: ethers.providers.Provider;
    wallet: ethers.Wallet | undefined;
    lotteryContract: ethers.Contract | undefined;
    lotteryTokenContract: ethers.Contract | undefined;
    etherBalance: number | undefined;
    tokenBalance: number | undefined;
    targetTimestamp: number | undefined;
    yourPrize: string | undefined;
    claimable: boolean = false;
    closingTime: Date | undefined;
    lotteryTokenAddress: string | undefined;
    lotteryState: string | undefined;
    betsOpen: boolean | undefined;
    needsToBeClosed: boolean | undefined;

    lotteryAddress = "0xe60B3941Febe2C1cEa66C7D19030c71f5c1EAd25";

    constructor(private http: HttpClient) { // provider
        this.provider = new ethers.providers.AlchemyProvider("goerli", "VolM1WALxUNSPM6PXsob2QK3Ve0834qc");
    }

    getBalances() {
        if (this.wallet && this.lotteryContract && this.lotteryTokenContract) {
            this.wallet.getBalance().then((balanceBN: ethers.BigNumberish) => {
                this.etherBalance = parseFloat(ethers.utils.formatEther(balanceBN));
            });

            this.lotteryTokenContract["balanceOf"](this.wallet.address).then((balanceBN: ethers.BigNumberish) => {
                this.tokenBalance = parseFloat(ethers.utils.formatEther(balanceBN));
            });
            this.lotteryContract["betsOpen"]().then((result: boolean) => {
                this.betsOpen = result;
                this.lotteryState = result ? "open" : "closed";
                if (this.lotteryState) {
                    this.lotteryContract!["betsClosingTime"]().then((targetTimestamp: number) => {
                        this.targetTimestamp = targetTimestamp;
                        this.closingTime = new Date(targetTimestamp * 1000);
                        const currentBlock = this.provider.getBlock("latest").then((block) => {
                            const leftTime = this.targetTimestamp! - block.timestamp;  
                            if (leftTime < 0 && this.betsOpen) {
                                this.needsToBeClosed = true;
                            }
                        }); 
                    });
                }
            });    
        }
    }     

    connectWallet(privateKey: string) {
        const wallet1 = new ethers.Wallet(privateKey, this.provider);
        this.wallet = wallet1.connect(this.provider);
        this.lotteryContract = new ethers.Contract(this.lotteryAddress, lotteryJson.abi, this.wallet);
        this.lotteryContract["paymentToken"]().then((tokenAddress: string) => {
            this.lotteryTokenAddress = tokenAddress;
            console.log("lotteryTokenAddress: " + this.lotteryTokenAddress);
            this.lotteryTokenContract = new ethers.Contract(tokenAddress, lotteryTokenJson.abi, this.wallet);
            this.getBalances();
        });

        this.displayOwnerPool();
        this.displayPrize();
    }

    displayOwnerPool() {
        if (this.lotteryContract) {
            this.lotteryContract["ownerPool"]().then((owner: string) => {
                console.log("Owner: " + owner);
            });
        }
    }

    openBets(duration: number) {
        this.provider.getBlock("latest").then((block) => {
            this.targetTimestamp = block.timestamp + Number(duration);
            console.log("targetBlock: " + this.targetTimestamp);
            this.lotteryContract!["openBets"](this.targetTimestamp, { gasLimit: 10000000 }).then((tx: ethers.ContractTransaction) => {
                tx.wait().then((receipt) => {
                    console.log("Bets opened: " + receipt.transactionHash);
                    this.getBalances();
                }).catch((error) => {
                    console.log(error);
                    alert("Error Transaction failed");
                });
            });
        });
    }

    closeLottery() {
        if (this.lotteryContract) {
            this.lotteryContract["closeLottery"]({ gasLimit: 1000000 }).then((tx: ethers.ContractTransaction) => {
                tx.wait().then((receipt) => {
                    console.log("Bets closed: " + receipt.transactionHash);
                }).catch((error) => {
                    console.log(error);
                    alert("Error Transaction failed");
                });
            });
        }
    }

    buyTokens(amount: string) {
        console.log("buyTokens: " + amount, this.lotteryContract);
        if (this.lotteryContract) {
            this.lotteryContract["purchaseTokens"]({ value: ethers.utils.parseEther(amount).div(TOKEN_RATIO) }).then((tx: ethers.ContractTransaction) => {
                tx.wait().then((receipt) => {
                    console.log("Tokens bought: " + receipt.transactionHash);
                    this.getBalances();
                }).catch((error) => {
                    console.log(error);
                    alert("Error Transaction failed");
                });
            });
        }
    }

    burnTokens(amount: string) {
        console.log("burn tokens: " + amount, this.lotteryContract);
        if (this.lotteryTokenContract) {
            this.lotteryTokenContract["approve"](this.lotteryAddress, ethers.constants.MaxUint256, { gasLimit: 1000000 }).then((tx: ethers.ContractTransaction) => {
                tx.wait().then((receipt) => {
                    console.log("token approved: " + receipt.transactionHash);
                    this.lotteryContract!["returnTokens"](ethers.utils.parseEther(amount), { gasLimit: 1000000 }).then((tx: ethers.ContractTransaction) => {
                        tx.wait().then((receipt) => {
                            console.log("return tokens: " + receipt.transactionHash);
                            this.getBalances();
                        }).catch((error) => {
                            console.log(error);
                            alert("Error Transaction failed");
                        });
                    });
                }).catch((error) => {
                    console.log(error);
                    alert("Error Transaction failed");
                });
            });
        }
    }

    betTokens(amount: string) {
        console.log("betTokens: " + amount, this.lotteryContract);
        if (this.lotteryTokenContract) {
            this.lotteryTokenContract["approve"](this.lotteryAddress, ethers.constants.MaxUint256, { gasLimit: 1000000 }).then((tx: ethers.ContractTransaction) => {
                tx.wait().then((receipt) => {
                    console.log("token approved: " + receipt.transactionHash);
                    this.lotteryContract!["betMany"](amount, { gasLimit: 10000000 }).then((tx: ethers.ContractTransaction) => {
                        tx.wait().then((receipt) => {
                            console.log("betMany: " + receipt.transactionHash);
                            this.getBalances();
                        }).catch((error) => {
                            console.log(error);
                            alert("Error Transaction failed");
                        });
                    });
                }).catch((error) => {
                    console.log(error);
                    alert("Error Transaction failed");
                });
            });
        }
    }

    displayPrize() {
        if (this.lotteryContract) {
            this.lotteryContract["prize"](this.wallet?.address, { gasLimit: 1000000 }).then((prizeBN: any) => {
                const prize = ethers.utils.formatEther(prizeBN);
                this.yourPrize = prize;
                this.claimable = prizeBN > 0;
            });
        }
    }

    claimPrize(amount: string) {
        if (this.lotteryContract) {
            this.lotteryContract["prizeWithdraw"](ethers.utils.parseEther(amount), { gasLimit: 1000000 }).then((tx: ethers.ContractTransaction) => {
                tx.wait().then((receipt) => {
                    console.log("prize withdraw: " + receipt.transactionHash);
                    this.getBalances();
                }).catch((error) => {
                    console.log(error);
                    alert("Error Transaction failed");
                });
            });
        }
    }
}
