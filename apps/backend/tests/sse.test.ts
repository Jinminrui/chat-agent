import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEWriter } from '../src/lib/sse';

describe('SSEWriter', () => {
  let mockReply: any;
  let mockRaw: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRaw = {
      writeHead: vi.fn(),
      write: vi.fn(),
    };
    mockReply = { raw: mockRaw };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets correct headers', () => {
    new SSEWriter(mockReply);
    expect(mockRaw.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
  });

  it('writes delta events correctly', () => {
    const writer = new SSEWriter(mockReply);
    writer.delta('hello');

    expect(mockRaw.write).toHaveBeenCalledWith(
      'event: delta\nid: 1\ndata: {"content":"hello"}\n\n'
    );
  });

  it('increments id for each event', () => {
    const writer = new SSEWriter(mockReply);
    writer.delta('a');
    writer.delta('b');

    const calls = mockRaw.write.mock.calls;
    expect(calls[0][0]).toContain('id: 1');
    expect(calls[1][0]).toContain('id: 2');
  });

  it('writes tool events correctly', () => {
    const writer = new SSEWriter(mockReply);
    writer.toolStart('web-search', { query: 'test' });
    writer.toolEnd('web-search', { result: 'ok' });

    const calls = mockRaw.write.mock.calls;
    expect(calls[0][0]).toContain('event: tool.start');
    expect(calls[1][0]).toContain('event: tool.end');
  });

  it('writes done event and cleans up', () => {
    const writer = new SSEWriter(mockReply);
    writer.done('msg_123', 100);

    expect(mockRaw.write).toHaveBeenCalledWith(
      'event: done\nid: 1\ndata: {"messageId":"msg_123","totalTokens":100}\n\n'
    );
  });

  it('sends heartbeat on interval', () => {
    const writer = new SSEWriter(mockReply, 1000);

    vi.advanceTimersByTime(1000);
    expect(mockRaw.write).toHaveBeenCalledTimes(1);
    expect(mockRaw.write.mock.calls[0][0]).toContain('event: heartbeat');

    vi.advanceTimersByTime(1000);
    expect(mockRaw.write).toHaveBeenCalledTimes(2);
  });
});
