# File Systems

## 🟢 Beginner Level

### What is a File System?
A file system controls **how data is stored and retrieved** on a storage device. It manages files, directories, metadata, and free space.

### File Concepts
- **File**: Named collection of related data (bytes)
- **Directory**: Structure that holds files and other directories
- **Path**: Location of a file (absolute or relative)
- **File Attributes**: Name, size, permissions, timestamps, owner

### File Operations
```
Create, Open, Read, Write, Seek, Delete, Close, Truncate
```

### Directory Structure Types
1. **Single-Level**: All files in one directory (MS-DOS early days)
2. **Two-Level**: Separate directory per user
3. **Tree-Structured**: Hierarchical (most modern systems)
4. **Acyclic Graph**: Directories can link to subdirectories (symbolic links)
5. **General Graph**: Cycles allowed (hard links to directories — rare)

---

## 🟡 Intermediate Level

### File Allocation Methods

#### 1. Contiguous Allocation
Each file occupies a contiguous block of disk blocks.

```
File A: [blocks 0-4]
File B: [blocks 5-9]
```

**Pros**: Fast sequential access, simple
**Cons**: External fragmentation, need to know file size upfront

#### 2. Linked Allocation
Each block contains a pointer to the next block.

```
File: Block[0→data|next→1] → Block[1→data|next→2] → ...
```

**Pros**: No fragmentation, size can grow dynamically
**Cons**: Slow random access (must traverse), pointer space overhead

#### 3. Indexed Allocation
Each file has an index block pointing to all its data blocks.

```
File A Index Block: [0, 4, 7, 12, ...]
```

**Pros**: Fast random access, no fragmentation
**Cons**: Index block overhead (small files waste space)

#### 4. Extent-based (modern approach)
Hybrid: Files start with a few direct blocks, then extent pointers for contiguous ranges.

### Free Space Management
- **Bit Vector / Bitmap**: 1 bit per block (used by many FS)
- **Linked List**: Free block points to next free block
- **Grouping**: First free block contains addresses of next N free blocks
- **Counting**: Track run of contiguous free blocks (extents)

### Directory Implementation
- **Linear List**: Simple but slow for large directories
- **Hash Table**: Faster lookups, but limited to fixed size (hash collisions)
- **B-Tree**: Balanced tree — used by modern FS (NTFS, Ext4, APFS)
- **Radix Tree**: Used by some for inode caches

---

## 🔴 Expert Level

### Inode-based Filesystems (Unix/Linux)
Everything is a file. Each file has an **inode** (index node):

```c
struct inode {
    uid_t i_uid;           // owner
    mode_t i_mode;         // permissions + file type
    nlink_t i_nlink;       // hard link count
    off_t i_size;          // file size
    struct timespec i_atime; // access time
    struct timespec i_mtime; // modify time
    struct timespec i_ctime; // change time
    block_t i_blocks[15];  // direct + indirect block pointers
};
```

The 15 block pointers in ext2/3:
- 12 direct blocks
- 1 single indirect block pointer
- 1 double indirect block pointer
- 1 triple indirect block pointer

### Journaling
Before modifying metadata, write the operation to a **journal** (log):

1. Write intent to journal
2. Apply changes to actual FS
3. Mark transaction complete in journal

**If crash during step 2**: Replay journal on mount → FS is consistent.

**Modes**:
- **Journaled**: Both metadata and data go through journal (slow, safe)
- **Ordered**: Journal metadata only, data written before journal commit (default in Ext4)
- **Writeback**: Journal metadata only, no ordering (fast, risk of stale data on crash)

### Ext4 Features
- Extents (replaces block pointers for large files)
- Delayed allocation (ext4 waits to allocate blocks, better defragmentation)
- Multi-block allocator (mballoc)
- Flexible block groups
- Checksums for journal
- Online defragmentation
- **64-bit**: Supports >16TB filesystems

### Btrfs (B-tree FS)
Copy-on-write B-tree based filesystem:
- Snapshots (instant, space-efficient)
- **RAID** built-in (0, 1, 5, 6, 10)
- Compression (zlib, lzo, zstd)
- Checksums for data and metadata (detect bit rot)
- Subvolumes and quotas
- Send/receive for incremental backup

### ZFS (Zettabyte File System)
- **Pooled storage** (zpool): No separate partitions
- **Copy-on-write**: All writes go to new location
- **128-bit checksums**: All data and metadata verified
- **ARC (Adaptive Replacement Cache)**: Advanced caching algorithm
- **Deduplication**: Block-level dedup
- **Compression**: LZ4, ZLE, gzip
- **Snapshot + Clone**: Instant, writable snapshots

### FUSE (Filesystem in Userspace)
Run filesystems as user-space processes:
- `sshfs`: Access remote FS over SSH
- `s3fs`: Mount S3 as local filesystem
- `rclone mount`: Cloud storage mounts

**Trade-off**: Higher latency due to kernel↔user context switches.

### Virtual File System (VFS)
Abstract layer over different filesystem implementations:

```
User → System Call → VFS → Ext4 / NTFS / Btrfs / NFS
```

VFS defines common interfaces:
- `struct file_operations` (read, write, mmap, open, release)
- `struct inode_operations` (create, link, unlink, mkdir)
- `struct super_operations` (read_inode, write_inode, sync_fs)

### Key Interview Questions
1. Difference between inode and dentry?
2. How does Ext4's extents differ from Ext3's block pointers?
3. What is journaling and why is it needed?
4. Explain copy-on-write in Btrfs/ZFS
5. What are hard links vs symbolic links? Underlying inode differences?
6. How does VFS work in Linux?
7. What is FUSE and when would you use it?
8. Compare NTFS and Ext4
9. How does directory lookup work (path resolution)?
10. Explain delayed allocation and its trade-offs
