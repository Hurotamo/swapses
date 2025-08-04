use secp256k1::PublicKey;
use sha2::{Sha256, Digest};
use sha3::{Keccak256, Digest as KeccakDigest};

pub fn public_key_to_address(public_key: &PublicKey) -> String {
    let public_key_bytes = public_key.serialize_uncompressed();
    
    // Remove the first byte (0x04) which indicates uncompressed format
    let public_key_hash = &public_key_bytes[1..];
    
    // Keccak256 hash
    let mut hasher = Keccak256::new();
    hasher.update(public_key_hash);
    let result = hasher.finalize();
    
    // Take the last 20 bytes and convert to hex
    let address_bytes = &result[12..];
    format!("0x{}", hex::encode(address_bytes))
}

pub fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(data);
    let result = hasher.finalize();
    result.into()
}

pub fn sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    result.into()
} 