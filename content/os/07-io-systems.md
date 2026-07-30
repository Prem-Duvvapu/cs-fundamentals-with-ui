# I/O Systems

## 🟢 Beginner Level

### What is I/O Management?
The OS manages communication between the CPU and peripheral devices (keyboard, mouse, disk, display, network card).

### I/O Hardware Basics
- **Port**: Connection point for devices
- **Bus**: Set of wires for data transmission (PCIe, USB, SATA)
- **Controller**: Hardware that manages device operations
- **Device Driver**: Software that talks to the controller

### Memory-Mapped I/O vs Port-Mapped I/O
| Feature | MMIO | PMIO |
|---------|------|------|
| Address Space | Same as memory | Separate I/O space |
| Instructions | `load/store` | `in/out` |
| x86 Example | PCI config space | Legacy COM ports |

---

## 🟡 Intermediate Level

### I/O Control Methods

#### 1. Programmed I/O (Polling)
CPU repeatedly checks device status register:

```c
while (!(status & DONE));  // busy wait
data = port_in(DATA_REG);
```

**Pros**: Simple
**Cons**: Wastes CPU cycles (busy waiting)

#### 2. Interrupt-Driven I/O
Device sends an interrupt signal when ready:

```
CPU → Issue I/O command → Continue other work
                        ← Device sends interrupt
                        → CPU services interrupt (ISR)
```

**Interrupt Handling**:
1. Save current state (registers)
2. Identify interrupting device (vector)
3. Execute Interrupt Service Routine (ISR)
4. Restore state and return

**Interrupt Types**:
- **Maskable**: Can be disabled (IRQs)
- **Non-maskable (NMI)**: Critical events (hardware failures)
- **Edge-triggered**: Fires on signal transition
- **Level-triggered**: Fires while signal is active

#### 3. Direct Memory Access (DMA)
Device controller transfers data directly to/from memory without CPU involvement:

```
1. CPU sets up DMA controller: source, dest, count
2. CPU continues other work
3. DMA controller transfers data (steals bus cycles)
4. DMA controller interrupts CPU on completion
```

**DMA Modes**:
- **Cycle Stealing**: One word at a time, interleaved with CPU
- **Burst Mode**: Transfer entire block, CPU paused
- **Fly-By Mode**: Data flows directly between device and memory (not through DMA controller)

### I/O Buffering
- **Single Buffer**: OS reads into buffer, then copies to user space
- **Double Buffer**: One buffer fills while other empties
- **Circular Buffer**: Multiple slots for streaming data

### SPOOLing (Simultaneous Peripheral Operations Online)
Queues output for slow devices (printers). Each user's job is stored on disk, printed one at a time.

---

## 🔴 Expert Level

### Linux I/O Stack

```
┌─────────────────────┐
│ User Application     │  read(), write()
├─────────────────────┤
│ VFS Layer            │  Generic file operations
├─────────────────────┤
│ Filesystem (Ext4)    │  Block mapping, journaling
├─────────────────────┤
│ Block Layer          │  I/O scheduling, merging
├─────────────────────┤
│ Device Driver        │  Hardware-specific
└─────────────────────┘
```

### I/O Scheduling (Block Layer)
Reorders requests for efficiency:

| Algorithm | Description | Use Case |
|-----------|-------------|----------|
| **CFQ (Completely Fair)** | Per-process queues, time slices | General purpose |
| **Deadline** | Per-request deadlines, avoids starvation | Database workloads |
| **NOOP** | Simple FIFO, no reordering | SSDs, NVMe |
| **BFG** | Fair queuing with latency targets | Interactive workloads |

### Linux I/O Models

#### 1. Synchronous Blocking I/O
```c
read(fd, buf, 1024);  // blocks until data is ready
```

#### 2. Synchronous Non-blocking I/O
```c
fcntl(fd, F_SETFL, O_NONBLOCK);
while ((n = read(fd, buf, 1024)) == -EAGAIN);
```

#### 3. I/O Multiplexing (select / poll / epoll)
Monitor multiple file descriptors:
```c
// epoll (Linux): scales to millions of FDs
epoll_wait(epfd, events, MAX_EVENTS, -1);
```

#### 4. Asynchronous I/O (AIO)
```c
// Linux io_uring (modern, efficient)
struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd, buf, 1024, 0);
io_uring_submit(&ring);
// ... do other work ...
io_uring_wait_cqe(&ring, &cqe);  // get completion
```

### io_uring (Linux 5.1+)
Shared submission/completion queues between kernel and userspace:
- Zero-copy: No syscall needed for I/O submission
- SQPOLL: Kernel thread polls submission queue (true async)
- Supports polled I/O, buffered, direct, O_DIRECT
- **The most efficient Linux async I/O mechanism**

### Storage Hardware
- **HDD**: Spinning platters, seek time + rotational latency (ms)
- **SSD**: NAND flash, ~100μs latency, no mechanical parts
- **NVMe**: Direct PCIe connection, <10μs latency, 64K queues
- **Optane (3D XPoint)**: ~10μs, non-volatile, between DRAM and NAND (discontinued but architecture influential)

### Kernel Bypass
- **DPDK**: Bypass kernel network stack for packet processing
- **SPDK**: Bypass kernel for storage (NVMe)
- **RDMA**: Direct memory access between machines (InfiniBand)
- **XDP**: eXpress Data Path — BPF program runs at network driver level

### Key Interview Questions
1. Compare programmed I/O, interrupt-driven I/O, and DMA
2. How does DMA transfer work? What is cycle stealing?
3. Difference between block devices and character devices?
4. How does epoll work internally?
5. Explain io_uring and how it improves AIO
6. What is interrupt context vs process context?
7. Difference between bottom half and top half of interrupt handling?
8. How does the Linux I/O scheduler work?
9. What is kernel bypass and when is it needed?
10. Compare NVMe vs SATA SSD in terms of I/O path
