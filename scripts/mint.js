const HugoNFT = artifacts.require("HugoNFT");

/**
 * Contract was deployed with 3 traits for each of 5 attributes. So trait ids are in interval [1;3].
 * These configurations can be changed in "../migrations/2_deploying_nft.js".
 *
 * Seed layout of attributes is: ["head", "glasses", "body", "shirt", "scarf"]. Can also be changed where
 * trait amount and attribute amount is set ("../migrations/2_deploying_nft.js").
 */
const ATTRIBUTES_AMOUNT = 5;
const SEED = Array(ATTRIBUTES_AMOUNT).fill(0).map(() => Math.floor(Math.random() * 3) + 1);
const NFT_NAME = `NFT-${SEED}-name`;
const NFT_DESCRIPTION = `NFT-${SEED}-description`

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

        console.log('[DEBUG] Minting for client1 with address', client1);
        await nft.mint(client1, SEED, NFT_NAME, NFT_DESCRIPTION, {from: minter})

        let clientIds = await getTokenIdsOfAccount(client1);
        console.log('[DEBUG]', client1, 'now owns token ids', clientIds);
    }
    catch(error) {
        console.log(error)
    }

    callback()
}
