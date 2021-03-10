const {
  Client,
  Wallet,
  Transaction,
  Message,
} = require("@bandprotocol/bandchain.js");
const { Obi } = require("@bandprotocol/obi.js");
const axios = require("axios");
const { PrivateKey } = Wallet;
const { MsgRequest } = Message;
const IconService = require("icon-sdk-js");
const {
  IconBuilder,
  IconConverter,
  SignedTransaction,
  IconWallet,
  HttpProvider,
} = IconService;
const { CallTransactionBuilder, CallBuilder } = IconBuilder;
const encode = require("./obi");

const ICON_PRIVATE_KEY =
  "2e088da80e55768d3779a16ad40e80e2d23cc27d1fa51f28ddca0a1cb3a0cf19";
const BRIDGE_CONTRACT = "cxb94de9090263f03c617d7e1ca767c23ca4efc6f2";
const ICON_ENDPOINT = "https://bicon.net.solidwallet.io/api/v3";
const BAND_ENDPOINT = "http://guanyu-testnet3-query.bandchain.org";
const BAND_MNEMONIC =
  "panther winner rain empower olympic attract find satoshi meadow panda job ten urge warfare piece walnut help jump usage vicious neither shallow mule laundry";

// Instantiating BandChain with endpoint
const bandchain = new Client(BAND_ENDPOINT);
// Instantiating Band private key with mnemonic
const bandPrivkey = PrivateKey.fromMnemonic(BAND_MNEMONIC);

// Instantiating IconService with endpoint
const iconService = new IconService(new HttpProvider(ICON_ENDPOINT));

// Request params
const minCount = 3;
const askCount = 4;
// Odd oracle script id
const oddOracleScriptID = 10;

const requestOdd = async () => {
  // Create a new request, which will block until the tx is confirmed
  try {
    const requesterAddress = bandPrivkey.toPubkey().toAddress();
    const account = await bandchain.getAccount(requesterAddress);
    const chainID = await bandchain.getChainID();

    const calldata = new Obi(
      "{category:string,date1:string,date2:string,tournament_name:string,contest_id:string,odds_type:string,bookmaker_id:string}/{value:string}"
    ).encodeInput({
      category: "football",
      date1: "20.01.2021",
      date2: "30.01.2021",
      tournament_name: "PostSeason",
      contest_id: "91084",
      odds_type: "handicap",
      bookmaker_id: "20",
    });

    const calldata2 = new Obi(
      "{category:string,date1:string,date2:string,tournament_name:string,contest_id:string,odds_type:string,bookmaker_id:string}/{value:string}"
    ).encodeInput({
      category: "football",
      date1: "21.01.2021",
      date2: "30.01.2021",
      tournament_name: "PostSeason",
      contest_id: "91084",
      odds_type: "handicap",
      bookmaker_id: "20",
    });

    const clientID = "iconbet";
    const tx = new Transaction()
      .withMessages(
        new MsgRequest(
          oddOracleScriptID,
          calldata,
          askCount,
          minCount,
          clientID,
          requesterAddress
        ),
        new MsgRequest(
          oddOracleScriptID,
          calldata2,
          askCount,
          minCount,
          clientID,
          requesterAddress
        )
      )
      .withAccountNum(account.accountNumber)
      .withSequence(account.sequence)
      .withChainID(chainID)
      .withGas(5000000)
      .withMemo("bandchain.js example");

    const signature = bandPrivkey.sign(tx.getSignData());
    const rawTx = tx.getTxData(signature, bandPrivkey.toPubkey());

    const txResult = await bandchain.sendTxBlockMode(rawTx);

    const requestIDs = await bandchain.getRequestIDByTxHash(txResult.txHash);

    console.log("RequestID: " + requestIDs);

    let proofs = [];
    for (let requestID of requestIDs) {
      const proofURL = `${BAND_ENDPOINT}/oracle/proof/${requestID}`;
      console.log(proofURL);
      for (let i = 0; i < 10; i++) {
        try {
          await new Promise((r) => setTimeout(r, 5000));
          const proof = await axios.get(proofURL);
          proofs = [...proofs, proof["data"]["result"]["jsonProof"]];
          break;
        } catch (e) {
          console.log("try getting proof:", i);
        }
      }
    }
    return proofs;
  } catch (e) {
    console.log(JSON.stringify(e));
    console.error("Data request failed");
  }
};

// const requestScore = async () => {
//   // Create an instance of OracleScript with the script ID
//   const oracleScript = await bandchain.getOracleScript(score_oracle_script_id);

//   // Create a new request, which will block until the tx is confirmed
//   try {
//     const mnemonic = BAND_MNEMONIC;
//     const requestId = await bandchain.submitRequestTx(
//       oracleScript,
//       {
//         category: "football",
//         date: "11.10.2020",
//         contest_id: "90891",
//       },
//       { minCount, askCount },
//       mnemonic
//     );

//     console.log("RequestID: " + requestId);
//     const proof = await bandchain.getRequestProof(requestId);

//     return [proof["jsonProof"], oracleScript];
//   } catch (e) {
//     console.log(e);
//     console.error("Data request failed");
//   }
// };

const sendRelay = async (proof) => {
  const wallet = IconWallet.loadPrivateKey(ICON_PRIVATE_KEY);

  const txObj = new CallTransactionBuilder()
    .from(wallet.getAddress())
    .to(BRIDGE_CONTRACT)
    .stepLimit(IconConverter.toBigNumber("3000000"))
    .nid(IconConverter.toBigNumber("3"))
    .nonce(IconConverter.toBigNumber("1"))
    .version(IconConverter.toBigNumber("3"))
    .timestamp(new Date().getTime() * 1000)
    .method("relay")
    .params({ proof })
    .build();

  const signedTransaction = new SignedTransaction(txObj, wallet);

  console.log("sender: ", wallet.getAddress());

  try {
    const txHash = await iconService
      .sendTransaction(signedTransaction)
      .execute();
    console.log("txHash: ", txHash);
  } catch (e) {
    console.log(e);
  }
};

// const getResultInIcon = async (requestKey, schema) => {
//   const callBuilder = new CallBuilder();
//   const call = callBuilder
//     .to(BRIDGE_CONTRACT)
//     .method("get_latest_response")
//     .params({ encoded_request: requestKey.toString("hex") })
//     .build();

//   const res = await iconService.call(call).execute();
//   return new Obi(schema).decodeOutput(
//     Buffer.from(res["result"].slice(2), "hex")
//   );
// };

(async () => {
  console.log("Start getting proof");
  const proofs = await requestOdd();

  for (let i = 0; i < proofs.length; i++) {
    const proof = proofs[i];
    console.log("band's block height: ", proof["blockHeight"]);

    const encodedProof = encode(proof, "Proof");
    const requestKey = encode(
      proof["oracleDataProof"]["requestPacket"],
      "RequestPacket"
    );

    // Relay proof to icon chain
    console.log("request key: ", requestKey.toString("hex"));
    await sendRelay(encodedProof.toString("hex"));
  }
})();
