use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;
use std::hash::{Hash, Hasher};

/// Strongly-typed Ethereum / Arc Network address.
///
/// Ensures addresses are syntactically valid (0x prefix + 40 hex characters)
/// and normalizes them to lowercase to prevent case-sensitive security bypasses.
#[derive(Debug, Clone)]
pub struct Address(String);

impl Address {
    /// Parse and normalize a hex address string.
    pub fn parse(s: &str) -> Result<Self, AddressParseError> {
        let trimmed = s.trim();
        if !trimmed.starts_with("0x") && !trimmed.starts_with("0X") {
            return Err(AddressParseError::MissingPrefix);
        }
        if trimmed.len() != 42 {
            return Err(AddressParseError::InvalidLength(trimmed.len()));
        }
        let hex_part = &trimmed[2..];
        if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(AddressParseError::InvalidHexCharacters);
        }
        Ok(Address(format!("0x{}", hex_part.to_ascii_lowercase())))
    }

    /// Return string slice of the normalized address.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum AddressParseError {
    MissingPrefix,
    InvalidLength(usize),
    InvalidHexCharacters,
}

impl fmt::Display for AddressParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AddressParseError::MissingPrefix => write!(f, "address must start with '0x'"),
            AddressParseError::InvalidLength(len) => {
                write!(f, "address must be exactly 42 characters, got {}", len)
            }
            AddressParseError::InvalidHexCharacters => {
                write!(f, "address contains non-hexadecimal characters")
            }
        }
    }
}

impl std::error::Error for AddressParseError {}

impl fmt::Display for Address {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl PartialEq for Address {
    fn eq(&self, other: &Self) -> bool {
        self.0 == other.0
    }
}

impl Eq for Address {}

impl Hash for Address {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.0.hash(state);
    }
}

impl Serialize for Address {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for Address {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Address::parse(&s).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_address_normalization() {
        let addr1 = Address::parse("0x71C678d311516474809e39842c12f44b20a32508").unwrap();
        let addr2 = Address::parse("0x71c678d311516474809e39842c12f44b20a32508").unwrap();
        assert_eq!(addr1, addr2);
        assert_eq!(addr1.as_str(), "0x71c678d311516474809e39842c12f44b20a32508");
    }

    #[test]
    fn test_invalid_prefix() {
        assert!(matches!(
            Address::parse("71c678d311516474809e39842c12f44b20a32508"),
            Err(AddressParseError::MissingPrefix)
        ));
    }

    #[test]
    fn test_invalid_length() {
        assert!(matches!(
            Address::parse("0x1234"),
            Err(AddressParseError::InvalidLength(6))
        ));
    }

    #[test]
    fn test_invalid_characters() {
        assert!(matches!(
            Address::parse("0x71c678d311516474809e39842c12f44b20a3250z"),
            Err(AddressParseError::InvalidHexCharacters)
        ));
    }
}
