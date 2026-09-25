mod adapters;
mod commands;
mod dto;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::get_catalog])
        .run(tauri::generate_context!())
        .expect("failed to run kmux Desktop");
}
