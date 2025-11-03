export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export async function postJSON(path, body) {
	// ...simple wrapper that returns parsed JSON or throws
	const res = await fetch(`${API_BASE}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(body),
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const err = new Error(data?.message || data?.error || "Request failed");
		err.response = data;
		throw err;
	}
	return data;
}
