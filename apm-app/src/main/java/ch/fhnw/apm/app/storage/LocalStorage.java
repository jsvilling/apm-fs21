package ch.fhnw.apm.app.storage;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class LocalStorage implements Storage {

    private final Map<Integer, String> storage = new ConcurrentHashMap<>();

    @Override
    public boolean store(int key, String value) {
        if (value == null) {
            storage.remove(key);
        } else {
            storage.put(key, value);
        }
        return true;
    }

    @Override
    public String load(int key) {
        return storage.get(key);
    }

}
