const HugoNFT = artifacts.require("HugoNFT");

/**
 * Contract was deployed with 3 traits for each of 5 attributes. So trait ids are in interval [1;3].
 * These configurations can be changed in "../migrations/2_deploying_nft.js".
 *
 * Seed layout of attributes is: ["head", "glasses", "body", "shirt", "scarf"]. Can also be changed where
 * trait amount and attribute amount is set ("../migrations/2_deploying_nft.js").
 */
const RANDOM = Math.floor(Math.random() * 10000);
const NFT_NAME = `Exclusive NFT with random name - name${RANDOM}`;
const NFT_DESCRIPTION = `Exclusive NFT with random description -description${RANDOM}`
const exampleCID = "QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR";

module.exports = async function(callback) {
    try {
        const accounts = await web3.eth.getAccounts()

        const client1 = accounts[0];
        // const client2 = accounts[1];
        // const client3 = accounts[2];
        // const client4 = accounts[3];
        // const nft_admin = accounts[4];
        const minter = accounts[5];
        // const owner = accounts[6];

        const nft = await HugoNFT.deployed()
        console.log('[DEBUG] Interacting with NFT contract at', nft.address);

        const getTokenIdsOfAccount = async (account) => {
            let retIds = [];
            let idsBN = await nft.tokenIdsOfOwner.call(account);
            idsBN.forEach(bnNum => retIds.push(bnNum.toNumber()));
            return retIds;
        }

        console.log('[DEBUG] Minting exclusive NFT for client1 with address', client1);
        await nft.mintExclusive(client1, NFT_NAME, NFT_DESCRIPTION, exampleCID, {from: minter})

        let clientIds = await getTokenIdsOfAccount(client1);
        console.log('[DEBUG]', client1, 'now owns token ids', clientIds);
    }
    catch(error) {
        console.log(error)
    }

    callback()
}