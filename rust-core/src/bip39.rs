use bip39::{Mnemonic, MnemonicType, Language};
use rand::Rng;

pub fn generate_mnemonic() -> Result<String, Box<dyn std::error::Error>> {
    let mut rng = rand::thread_rng();
    let mnemonic = Mnemonic::new(MnemonicType::Words24, Language::English);
    Ok(mnemonic.phrase().to_string())
}

pub fn validate_mnemonic(mnemonic: &str) -> bool {
    Mnemonic::from_phrase(mnemonic, Language::English).is_ok()
}

pub fn mnemonic_to_seed(mnemonic: &str) -> Result<[u8; 64], Box<dyn std::error::Error>> {
    let mnemonic = Mnemonic::from_phrase(mnemonic, Language::English)?;
    let seed = mnemonic.to_seed("");
    Ok(seed)
} 