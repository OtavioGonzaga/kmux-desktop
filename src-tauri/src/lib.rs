mod adapters;
mod app_state;
mod commands;
mod dto;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(app_state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_catalog,
            commands::get_agents,
            commands::add_agent,
            commands::update_agent_socket,
            commands::remove_agent,
            commands::add_identity,
            commands::remove_identity,
            commands::get_identity_snapshot,
            commands::update_identity_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run kmux Desktop");
}
