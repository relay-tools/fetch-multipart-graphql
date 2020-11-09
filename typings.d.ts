// Minimum TypeScript Version: 3.0

declare class PatchResolver<T = unknown> {
    constructor(params?: { 
        onResponse: (result: T[]) => void
        boundary?: string;
    })
}

declare function MultipartFetchFunction<T = unknown>(url: string, params: {
    method?: string;
    headers?: Record<string, string>;
    credentials?: string;
    body?: string;
    onNext: (result: T[]) => void;
    onError: (error: unknown) => void;
    onComplete : () => void
}): void


export { PatchResolver}
export default MultipartFetchFunction
