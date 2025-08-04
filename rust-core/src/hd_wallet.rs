use crate::{WalletInfo, bip39};
use hdwallet::{HDWallet, DefaultKeyChain, ExtendedPrivKey, ExtendedPubKey};
use secp256k1::{Secp256k1, SecretKey, PublicKey};
use std::str::FromStr;

pub fn derive_parent_wallet(mnemonic: &str) -> Result<WalletInfo, Box<dyn std::error::Error>> {
    let seed = bip39::mnemonic_to_seed(mnemonic)?;
    let secp = Secp256k1::new();
    
    // Derive master key
    let master_key = ExtendedPrivKey::new(&secp, &seed)?;
    
    // Derive Ethereum path: m/44'/60'/0'/0/0
    let path = "m/44'/60'/0'/0/0";
    let child_key = master_key.derive_priv(&secp, &path.parse()?)?;
    
    let private_key = child_key.private_key;
    let public_key = PublicKey::from_secret_key(&secp, &private_key);
    
    // Generate Ethereum address
    let address = utils::public_key_to_address(&public_key);
    
    Ok(WalletInfo {
        address,
        private_key: hex::encode(private_key.secret_bytes()),
        public_key: hex::encode(public_key.serialize()),
    })
}

pub fn derive_child_wallets(mnemonic: &str, count: u32) -> Result<Vec<WalletInfo>, Box<dyn std::error::Error>> {
    let seed = bip39::mnemonic_to_seed(mnemonic)?;
    let secp = Secp256k1::new();
    
    // Derive master key
    let master_key = ExtendedPrivKey::new(&secp, &seed)?;
    
    let mut wallets = Vec::new();
    
    for i in 0..count {
        // Derive child path: m/44'/60'/0'/0/{i}
        let path = format!("m/44'/60'/0'/0/{}", i);
        let child_key = master_key.derive_priv(&secp, &path.parse()?)?;
        
        let private_key = child_key.private_key;
        let public_key = PublicKey::from_secret_key(&secp, &private_key);
        
        // Generate Ethereum address
        let address = utils::public_key_to_address(&public_key);
        
        wallets.push(WalletInfo {
            address,
            private_key: hex::encode(private_key.secret_bytes()),
            public_key: hex::encode(public_key.serialize()),
        });
    }
    
    Ok(wallets)
} 