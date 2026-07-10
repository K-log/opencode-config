import type { InstanceInfo } from "./lib/types"

const api: any = (globalThis as any).browser ?? (globalThis as any).chrome

function setStatus(message: string): void {
  const status = document.getElementById("status")
  if (status) status.textContent = message
}

function populateSelect(select: HTMLSelectElement, instances: InstanceInfo[]): void {
  select.innerHTML = ""

  let preselectValue: string | undefined

  for (const instance of instances) {
    const group = document.createElement("optgroup")
    group.label = instance.project

    for (const session of instance.sessions) {
      const option = document.createElement("option")
      option.value = `${instance.port}|${session.id}`
      option.textContent = session.title
      group.appendChild(option)

      if (
        preselectValue === undefined &&
        instance.lastActiveSessionID !== undefined &&
        session.id === instance.lastActiveSessionID
      ) {
        preselectValue = option.value
      }
    }

    select.appendChild(group)
  }

  if (preselectValue) select.value = preselectValue
}

document.addEventListener("DOMContentLoaded", async () => {
  const select = document.getElementById("session-select") as HTMLSelectElement
  const pickButton = document.getElementById("pick-button") as HTMLButtonElement

  pickButton.addEventListener("click", async () => {
    const value = select.value
    if (!value) {
      setStatus("No session selected.")
      return
    }

    const [portStr, sessionID] = value.split("|")

    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setStatus("No active tab found.")
        return
      }

      const result = await api.runtime.sendMessage({
        type: "INJECT_PICKER",
        tabId: tab.id,
        port: Number(portStr),
        sessionID,
      })

      if (!result?.ok) {
        setStatus(result?.error ?? "Failed to start picker.")
        return
      }

      window.close()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to start picker.")
    }
  })

  try {
    const response = await api.runtime.sendMessage({ type: "DISCOVER" })
    const instances = response?.instances ?? []

    if (instances.length === 0) {
      setStatus("No opencode sessions found. Is opencode running?")
    } else {
      populateSelect(select, instances)
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to discover opencode sessions.")
  }
})
