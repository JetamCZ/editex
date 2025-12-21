import React from "react";

export function useToRef<T>(toRef: T) {
    const ref = React.useRef<T>()
    ref.current = toRef

    return ref
}
