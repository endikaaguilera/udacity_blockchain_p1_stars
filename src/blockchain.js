/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');
const LoggerClass = require('./logger.js');

class Blockchain {

    logger = new LoggerClass.Logger();

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {

        this.chain = [];
        this.height = -1;
        this.initializeChain();

    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {

        if (this.height === -1) {

            let block = new BlockClass.Block({ data: 'Genesis Block' });
            await this._addBlock(block);

        }

    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {

        return new Promise((resolve, reject) => {

            resolve(this.height);

        });

    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {

        let self = this;

        return new Promise(async (resolve, reject) => {

            try {

                // Get chain height
                self.getChainHeight().then(async result => {

                    let errorLog = await self.validateChain();

                    // Check for errors
                    if (errorLog.length) {

                        this.logger.logMsg('_addBlock :: Error' + errorLog.join(', '));
                        reject(new Error('_addBlock :: Error'));

                    }

                    // Update height
                    self.height = result;
                    block.height = parseInt(self.height) + 1;

                    // UTC timestamp
                    block.time = new Date().getTime().toString().slice(0, -3);

                    if (self.chain.length > 0) {

                        // Get previous block hash
                        let previousBlock = await this.getBlockByHeight(self.height);
                        block.previousBlockHash = previousBlock.hash;

                    }

                    // SHA256 requires a string of data
                    block.hash = SHA256(JSON.stringify(block)).toString();

                    // Add block to chain
                    self.chain.push(block);
                    self.height = block.height;
                    resolve(block);

                });

            } catch (error) {

                this.logger.logMsg('_addBlock :: Error: ' + error);
                reject(new Error('_addBlock :: Error'));

            }

        });

    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {

        return new Promise((resolve) => {

            let message = `${address}:${new Date().getTime().toString().slice(0, -3)}:starRegistry`;
            this.logger.logMsg('requestMessageOwnershipVerification :: message: ' + message);
            resolve(message);

        });

    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {

        let self = this;

        return new Promise(async (resolve, reject) => {

            const time = parseInt(message.split(':')[1]);
            const currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
            const maxDelay = 5 * 60;

            // Validate elapsed time
            if (currentTime - time < maxDelay) {

                let msg = 'Elapsed time is greater than 5 minutes';
                this.logger.logMsg('submitStar :: error: ' + msg + ', address: ' + address + ', message: ' + message + ', signature' + signature + ', star: ' + star);
                reject(new Error(msg));

            }

            const isValid = bitcoinMessage.verify(message, address, signature);

            // Validate bitcoinMessage
            if (!isValid) {

                let msg = 'Verification failed';
                this.logger.logMsg('submitStar :: error: ' + msg + ', address: ' + address + ', message: ' + message + ', signature' + signature + ', star: ' + star);
                reject(new Error(msg));

            }

            try {

                // Create new bock
                const block = new BlockClass.Block({ star: star, owner: address });
                const res = await this._addBlock(block);
                resolve(res);

            } catch (error) {

                this.logger.logMsg('submitStar :: error: ' + msg + ', address: ' + address + ', message: ' + message + ', signature' + signature + ', star: ' + star);
                reject(error);

            }

        });

    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {

        let self = this;

        return new Promise((resolve, reject) => {

            // Search on the chain array for the block that has the hash
            let block = self.chain.find(p => p.hash === hash);

            if (block) {

                this.logger.logMsg('getBlockByHash :: block: ' + JSON.stringify(block));

                // Return the block
                resolve(block);

            } else {

                this.logger.logMsg('getBlockByHash :: block not found, hash: ' + hash);
                // Return null
                resolve(null);

            }

        });

    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {

        let self = this;

        return new Promise((resolve, reject) => {

            // Search on the chain array for the block that has the height
            let block = self.chain.filter(p => p.height === height)[0];

            if (block) {

                this.logger.logMsg('getBlockByHeight :: block: ' + JSON.stringify(block));

                // Return the block
                resolve(block);

            } else {

                this.logger.logMsg('getBlockByHeight :: block not found, height: ' + height);
                // Return null
                resolve(null);

            }

        });

    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress(address) {

        let self = this;
        let stars = [];

        return new Promise(async (resolve, reject) => {

            for (const block of self.chain) {

                // Get block data
                const blockData = await block.getBData();

                // Validate ownership
                if (blockData && blockData.owner === address) {

                    // Push the block to the stars array
                    stars.push(blockData)

                }

            }

            this.logger.logMsg('getStarsByWalletAddress :: Error' + stars.join(', '));

            // Resolve the stars array
            resolve(stars)

        });

    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {

        let self = this;
        let errorLog = [];

        return new Promise(async (resolve, reject) => {

            // use a loop to check the blocks
            for (let i = 0; i < this.chain.length; i++) {

                //take the current block
                const block = this.chain[i];

                if (!(await block.validate())) {

                    this.logger.logMsg('validateChain :: Error validating block, block: ' + block);
                    errorLog.push(block);

                }

                // Skip Genesis Block
                if (i === 0) continue;

                const previousBlock = this.chain[i - 1];

                // Compares current and previous hashes
                if (block.previousBlockHash !== previousBlock.hash) {

                    this.logger.logMsg('validateChain :: Error comparing hashes, block: ' + block);
                    errorLog.push(block);

                }

            }

            if (errorLog.length) {

                this.logger.logMsg('validateChain :: Error' + errorLog.join(', '));

            }
            
            // Resolve the errorLog
            resolve(errorLog);

        });

    }

}

module.exports.Blockchain = Blockchain;