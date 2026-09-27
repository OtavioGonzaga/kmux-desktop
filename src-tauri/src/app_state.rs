use kmux::config::ConfigSnapshot;
use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};

const MAX_SNAPSHOTS: usize = 64;
static SNAPSHOT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Default)]
pub struct AppState {
    snapshots: Mutex<SnapshotStore>,
}

#[derive(Default)]
struct SnapshotStore {
    order: VecDeque<String>,
    snapshots: HashMap<String, ConfigSnapshot>,
}

impl AppState {
    pub fn insert_snapshot(&self, snapshot: ConfigSnapshot) -> String {
        let id = uuid();
        let mut store = self.snapshots.lock().expect("snapshot mutex poisoned");
        while store.order.len() >= MAX_SNAPSHOTS {
            if let Some(expired) = store.order.pop_front() {
                store.snapshots.remove(&expired);
            }
        }
        store.order.push_back(id.clone());
        store.snapshots.insert(id.clone(), snapshot);
        id
    }

    pub fn get_snapshot(&self, id: &str) -> Option<ConfigSnapshot> {
        self.snapshots
            .lock()
            .expect("snapshot mutex poisoned")
            .snapshots
            .get(id)
            .cloned()
    }

    pub fn remove_snapshot(&self, id: &str) {
        let mut store = self.snapshots.lock().expect("snapshot mutex poisoned");
        store.snapshots.remove(id);
        store.order.retain(|entry| entry != id);
    }
}

fn uuid() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!(
        "{nanos:032x}-{:08x}-{:016x}",
        std::process::id(),
        SNAPSHOT_SEQUENCE.fetch_add(1, Ordering::Relaxed)
    )
}

#[cfg(test)]
mod tests {
    use super::{AppState, MAX_SNAPSHOTS};
    use kmux::config::{ConfigDocument, ConfigStore};
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_TEMP: AtomicU64 = AtomicU64::new(0);

    fn snapshot() -> (std::path::PathBuf, ConfigSnapshot) {
        let directory = std::env::temp_dir().join(format!(
            "kmux-desktop-snapshot-{}-{}",
            std::process::id(),
            NEXT_TEMP.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&directory).unwrap();
        let path = directory.join("config.toml");
        ConfigStore::save(&path, &ConfigDocument::empty()).unwrap();
        let snapshot = ConfigStore::load_versioned(&path).unwrap();
        (directory, snapshot)
    }

    use kmux::config::ConfigSnapshot;

    #[test]
    fn snapshots_are_retrievable_and_removable() {
        let (directory, snapshot) = snapshot();
        let state = AppState::default();
        let id = state.insert_snapshot(snapshot);

        assert!(state.get_snapshot(&id).is_some());
        state.remove_snapshot(&id);
        assert!(state.get_snapshot(&id).is_none());
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn snapshot_store_evicts_oldest_entries_at_its_limit() {
        let (directory, snapshot) = snapshot();
        let state = AppState::default();
        let ids = (0..=MAX_SNAPSHOTS)
            .map(|_| state.insert_snapshot(snapshot.clone()))
            .collect::<Vec<_>>();

        assert!(state.get_snapshot(&ids[0]).is_none());
        assert!(state.get_snapshot(ids.last().unwrap()).is_some());
        fs::remove_dir_all(directory).unwrap();
    }
}
