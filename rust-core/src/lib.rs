use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

mod bip39;
mod hd_wallet;
mod utils;

#[derive(Serialize, Deserialize)]
pub struct WalletInfo {
    pub address: String,
    pub private_key: String,
    pub public_key: String,
}

#[derive(Serialize, Deserialize)]
pub struct SplitResult {
    pub parent_wallet: WalletInfo,
    pub child_wallets: Vec<WalletInfo>,
}

#[wasm_bindgen]
pub fn generate_mnemonic() -> Result<String, JsValue> {
    bip39::generate_mnemonic()
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn derive_parent_wallet(mnemonic: &str) -> Result<JsValue, JsValue> {
    let wallet = hd_wallet::derive_parent_wallet(mnemonic)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    serde_wasm_bindgen::to_value(&wallet)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn derive_child_wallets(mnemonic: &str, count: u32) -> Result<JsValue, JsValue> {
    let wallets = hd_wallet::derive_child_wallets(mnemonic, count)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    serde_wasm_bindgen::to_value(&wallets)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn create_split_operation(mnemonic: &str) -> Result<JsValue, JsValue> {
    let parent = hd_wallet::derive_parent_wallet(mnemonic)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    let children = hd_wallet::derive_child_wallets(mnemonic, 100)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    let result = SplitResult {
        parent_wallet: parent,
        child_wallets: children,
    };
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn validate_mnemonic(mnemonic: &str) -> bool {
    bip39::validate_mnemonic(mnemonic)
} 