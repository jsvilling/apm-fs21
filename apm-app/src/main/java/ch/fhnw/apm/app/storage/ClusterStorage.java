package ch.fhnw.apm.app.storage;

import com.hazelcast.config.Config;
import com.hazelcast.core.IMap;

import static com.hazelcast.core.Hazelcast.newHazelcastInstance;

/**
 * This is a distributed storage for a clustered map. This class
 * requires the hazelcast library.
 */
public class ClusterStorage implements Storage {

    private final IMap<Integer, String> storage;

    public ClusterStorage(String mapName) {
        var instance = newHazelcastInstance(new Config());
        storage = instance.getMap(mapName);
    }

    @Override
    public boolean store(int id, String value) {
        if (value == null) {
            storage.remove(id);
        } else {
            storage.put(id, value);
        }
        return true;
    }

    @Override
    public String load(int id) {
        return storage.get(id);
    }
}
