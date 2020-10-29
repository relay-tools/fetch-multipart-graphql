// Minimum TypeScript Version: 3.0
import { ExecutionResult} from "graphql"

declare class PatchResolver {
    constructor(params?: { 
        onResponse: (result: ExecutionResult[]) => void
        boundary?: string;
    })
}

declare function MultipartFetchFunction(url: string, params: {
    method?: string;
    headers?: Record<string, string>;
    credentials?: string;
    body?: string;
    onNext: (result: ExecutionResult) => void;
    onError: (error: unknown) => void;
    onComplete : () => void
}): void


export { PatchResolver}
export default MultipartFetchFunction
