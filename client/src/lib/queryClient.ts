import { QueryClient } from "@tanstack/react-query";

// Handle error responses from the API
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    
    try {
      const errorData = await res.json();
      if (errorData.error) {
        errorMsg = errorData.error;
      } else if (errorData.message) {
        errorMsg = errorData.message;
      }
    } catch (e) {
      // If the response can't be parsed as JSON, use the status text
      errorMsg = res.statusText || errorMsg;
    }
    
    const error = new Error(errorMsg);
    throw error;
  }
  return res;
}

// Helper function for making API requests
export async function apiRequest(
  method: string,
  path: string,
  data?: any,
  options: RequestInit = {}
): Promise<Response> {
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
    ...options,
  };

  if (data !== undefined) {
    opts.body = JSON.stringify(data);
  }

  const res = await fetch(path, opts);
  return throwIfResNotOk(res);
}

// Request function for react-query
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T>(options: {
  on401: UnauthorizedBehavior;
}) => {
  return async ({ queryKey }: { queryKey: (string | number)[] }): Promise<T | undefined> => {
    const path = Array.isArray(queryKey[0])
      ? queryKey[0].join("/")
      : queryKey.join("/");
    
    try {
      const res = await apiRequest("GET", path);
      
      // For empty responses (like 204 No Content)
      if (res.status === 204) {
        return undefined;
      }
      
      return await res.json();
    } catch (error) {
      // Handle 401 Unauthorized based on options
      if (
        error instanceof Error &&
        error.message.includes("401") &&
        options.on401 === "returnNull"
      ) {
        return undefined;
      }
      throw error;
    }
  };
};

// Create and configure query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});