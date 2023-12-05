/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;

class SafeRecords extends Contract 
{
    // Initialize the ledger (optional)
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const documents = [
            { ID: 'user1', hash: 'hash1' },
            { ID: 'user2', hash: 'hash3' },
        ];

        for (const document of documents) 
        {
            await ctx.stub.putState(document.ID, Buffer.from(JSON.stringify(document)));
            console.info(`Added document ${document.ID}`);
        }

        console.info('============= END : Initialize Ledger ===========');
    }

    // Upload document hashes to the ledger
    async UploadHash(ctx, ID, hash) {
        console.info('============= START : Upload Document Hash ===========');

        // Check if the document with the given ID already exists
        const documentExists = await this.documentExists(ctx, ID);
        if (documentExists) {
            throw new Error(`Document with ID ${ID} already exists`);
        }

        // Create a new document object
        const document = { ID, hash };

        // Store the document on the ledger
        await ctx.stub.putState(ID, Buffer.from(JSON.stringify(document)));

        console.info('============= END : Upload Document Hash ===========');
    }

    // Query the ledger for a document hash by ID
    async queryDocument(ctx, ID) {
        console.info('============= START : Query Document ===========');

        // Retrieve the document from the ledger
        const documentJSON = await ctx.stub.getState(ID);
        if (!documentJSON || documentJSON.length === 0) {
            throw new Error(`Document with ID ${ID} does not exist`);
        }

        // Parse and return the document
        const document = JSON.parse(documentJSON.toString());
        console.info('============= END : Query Document ===========');
        return JSON.stringify(document);
    }

    // Check if a document with a given ID exists on the ledger
    async documentExists(ctx, ID) {
        const documentJSON = await ctx.stub.getState(ID);
        return documentJSON && documentJSON.length > 0;
    }
}

module.exports = SafeRecords;
