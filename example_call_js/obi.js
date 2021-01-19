const { Obi } = require("@bandprotocol/obi.js");
const crypto = require("crypto");

const encodeVarintUnsigned = (value) => {
  // Computes the size of the encoded value.
  let tempValue = value;
  let size = 0;
  while (tempValue > 0) {
    size++;
    tempValue >>= 7;
  }
  // Allocates the memory buffer and fills in the encoded value.
  let result = [];
  tempValue = value;
  for (let idx = 0; idx < size; idx++) {
    result = [...result, 128 | (tempValue & 127)];
    tempValue >>= 7;
  }
  result[size - 1] &= 127;
  return result;
};

const calculateTimeHash = (second, nanoSecond) => {
  let result = [8, ...encodeVarintUnsigned(second)];
  if (nanoSecond > 0) {
    result = [0, ...result, 16, ...encodeVarintUnsigned(nanoSecond)];
  }
  console.log(second, nanoSecond, Buffer.from(result));
  return crypto.createHash("sha256").update(Buffer.from(result)).digest();
};

const encode = (obj, type) => {
  const bytesData = {
    RequestPacket: ({
      client_id,
      oracle_script_id,
      calldata,
      ask_count,
      min_count,
    }) => {
      return new Obi(
        "{clientID: string, oracleScriptID: u64, calldata: bytes, askCount: u64, minCount: u64}/{_:u64}"
      ).encodeInput({
        clientID: client_id,
        oracleScriptID: Number(oracle_script_id),
        calldata: Buffer.from(calldata, "base64"),
        askCount: Number(ask_count),
        minCount: Number(min_count),
      });
    },
    ResponsePacket: ({
      client_id,
      request_id,
      ans_count,
      request_time,
      resolve_time,
      resolve_status,
      result,
    }) => {
      return new Obi(
        "{clientID: string, requestID: u64, ansCount: u64, requestTime: u64, resolveTime: u64, resolveStatus: u32, result: bytes}/{_:u64}"
      ).encodeInput({
        clientID: client_id,
        requestID: Number(request_id),
        ansCount: Number(ans_count),
        requestTime: Number(request_time),
        resolveTime: Number(resolve_time),
        resolveStatus: Number(resolve_status),
        result: Buffer.from(result, "base64"),
      });
    },
    IAVLMerklePaths: (paths) => {
      return new Obi(
        "[{isDataOnRight: u8, subtreeHeight: u8, subtreeSize: u64, subtreeVersion: u64, siblingHash: bytes}]/{_:u64}"
      ).encodeInput(
        paths.map(
          ({
            isDataOnRight,
            subtreeHeight,
            subtreeSize,
            subtreeVersion,
            siblingHash,
          }) => ({
            isDataOnRight: Number(isDataOnRight),
            subtreeHeight: Number(subtreeHeight),
            subtreeSize: Number(subtreeSize),
            subtreeVersion: Number(subtreeVersion),
            siblingHash: Buffer.from(siblingHash, "hex"),
          })
        )
      );
    },
    MultiStoreProof: ({
      accToGovStoresMerkleHash,
      mainAndMintStoresMerkleHash,
      oracleIAVLStateHash,
      paramsStoresMerkleHash,
      slashingToUpgradeStoresMerkleHash,
    }) =>
      Buffer.concat([
        Buffer.from(accToGovStoresMerkleHash, "hex"),
        Buffer.from(mainAndMintStoresMerkleHash, "hex"),
        Buffer.from(oracleIAVLStateHash, "hex"),
        Buffer.from(paramsStoresMerkleHash, "hex"),
        Buffer.from(slashingToUpgradeStoresMerkleHash, "hex"),
      ]),
    BlockHeaderMerkleParts: ({
      versionAndChainIdHash,
      timeSecond,
      timeNanoSecond,
      lastBlockIDAndOther,
      nextValidatorHashAndConsensusHash,
      lastResultsHash,
      evidenceAndProposerHash,
    }) =>
      Buffer.concat([
        Buffer.from(versionAndChainIdHash, "hex"),
        calculateTimeHash(Number(timeSecond), Number(timeNanoSecond)),
        Buffer.from(lastBlockIDAndOther, "hex"),
        Buffer.from(nextValidatorHashAndConsensusHash, "hex"),
        Buffer.from(lastResultsHash, "hex"),
        Buffer.from(evidenceAndProposerHash, "hex"),
      ]),
    Signatures: (sigs) => {
      return new Obi(
        "[{r: bytes, s: bytes, v: u8, signedDataPrefix: bytes, signedDataSuffix: bytes}]/{_:u64}"
      ).encodeInput(
        sigs.map(({ r, s, v, signedDataPrefix, signedDataSuffix }) => ({
          r: Buffer.from(r, "hex"),
          s: Buffer.from(s, "hex"),
          v: Number(v),
          signedDataPrefix: Buffer.from(signedDataPrefix, "hex"),
          signedDataSuffix: Buffer.from(signedDataSuffix, "hex"),
        }))
      );
    },
    Proof: ({
      blockHeight,
      oracleDataProof: { requestPacket, responsePacket, version, merklePaths },
      blockRelayProof: { multiStoreProof, blockHeaderMerkleParts, signatures },
    }) => {
      const encodeMultiStore = encode(multiStoreProof, "MultiStoreProof");
      const encodeBlockHeaderMerkleParts = encode(
        blockHeaderMerkleParts,
        "BlockHeaderMerkleParts"
      );
      const encodeSignatures = encode(signatures, "Signatures");
      const encodeReq = encode(requestPacket, "RequestPacket");
      const encodeRes = encode(responsePacket, "ResponsePacket");
      const encodeIAVLMerklePaths = encode(merklePaths, "IAVLMerklePaths");
      return new Obi(
        "{blockHeight: u64, multiStore: bytes, blockMerkleParts: bytes, signatures: bytes, packet: bytes, version: u64, iavlPaths: bytes}/{_:u64}"
      ).encodeInput({
        blockHeight: Number(blockHeight),
        multiStore: encodeMultiStore,
        blockMerkleParts: encodeBlockHeaderMerkleParts,
        signatures: encodeSignatures,
        packet: Buffer.concat([encodeReq, encodeRes]),
        version: Number(version),
        iavlPaths: encodeIAVLMerklePaths,
      });
    },
  }[type](obj);

  return bytesData;
};

module.exports = encode;
