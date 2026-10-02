package com.csfundamentals.example;
import java.util.List;
public record PageResult<T>(List<T> items, int page, int size, long total) {
    public PageResult { items = List.copyOf(items); }
    public static void check(int page, int size) {
        if (page < 0 || page > 100000 || size < 1 || size > 100)
            throw new IllegalArgumentException("Page must be 0 to 100000 and size 1 to 100.");
    }
}
