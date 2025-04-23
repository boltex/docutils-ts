export function publish_string(options: any): string {
    const input = options?.source || "";
    return `[docutils-ts] received: ${input.slice(0, 60)}...`;
}