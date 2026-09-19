use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
}

impl Config {
    pub fn load() -> Self {
        let port = env::var("POLICY_ENGINE_PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(8081);

        Config { port }
    }
}
