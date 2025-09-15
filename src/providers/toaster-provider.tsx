"use client"

import { Toaster } from "@/components/ui/toaster"
import { useEffect, useState } from "react"

export function ToasterProvider() {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) {
        return null
    }

    return <Toaster />
}
