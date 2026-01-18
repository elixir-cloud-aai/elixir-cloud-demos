import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "/api/middleware";

export default function MiddlewareManager() {
  const [middlewares, setMiddlewares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    class_path: "",
    order: 1,
    github_url: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMiddlewares();
  }, []);

  const fetchMiddlewares = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/status`);
      if (res.data && res.data.middlewares) {
        const arr = Object.values(res.data.middlewares).sort(
          (a, b) => (a.priority || a.order || 0) - (b.priority || b.order || 0)
        );
        setMiddlewares(arr);
      }
    } catch (e) {
      setError("Failed to fetch middlewares.");
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      let payload = {
        name: form.name,
        type: "custom",
        source: form.github_url ? "github" : "local",
        priority: Number(form.order),
      };
      if (form.github_url) {
        payload.githubUrl = form.github_url;
      } else {
        payload.class_path = form.class_path;
      }
      const res = await axios.post(`${API_BASE}/install`, payload);
      if (res.data && res.data.status === "success") {
        setMessage("Middleware added successfully!");
        setForm({ name: "", class_path: "", order: 1, github_url: "" });
        fetchMiddlewares();
      } else {
        setError(res.data.error || "Failed to add middleware.");
      }
    } catch (e) {
      setError("Error adding middleware: " + (e.response?.data?.error || e.message));
    }
  };

  const toggleEnabled = async (name) => {
    setMessage("");
    setError("");
    try {
        const res = await axios.post(`${API_BASE}/${encodeURIComponent(name)}/toggle`);
        if (res.data && res.data.status === "success") {
        setMessage(`Middleware "${name}" toggled.`);
        fetchMiddlewares();
        } else {
        setError(res.data.error || "Failed to toggle middleware.");
        }
    } catch (e) {
        setError("Error toggling middleware: " + (e.response?.data?.error || e.message));
    }
    };
  const handleDelete = async (name) => {
    setMessage("");
    setError("");
    if (!window.confirm(`Delete middleware "${name}"?`)) return;
    try {
      const res = await axios.delete(`${API_BASE}/${encodeURIComponent(name)}/remove`);
      if (res.data && res.data.status === "success") {
        setMessage(`Middleware "${name}" deleted.`);
        fetchMiddlewares();
      } else {
        setError(res.data.error || "Failed to delete middleware.");
      }
    } catch (e) {
      setError("Error deleting middleware: " + (e.response?.data?.error || e.message));
    }
  };

  const moveMiddleware = (index, direction) => {
    const newList = [...middlewares];
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= newList.length) return;
    [newList[index], newList[swapWith]] = [newList[swapWith], newList[index]];
    newList.forEach((mw, i) => (mw.priority = i + 1));
    setMiddlewares(newList);
  };

  const saveOrder = async () => {
    setMessage("");
    setError("");
    try {
      const payload = {
        middlewares: middlewares.map((mw, i) => ({
          name: mw.name,
          priority: i + 1,
        })),
      };
      const res = await axios.post(`${API_BASE}/reorder`, payload);
      if (res.data && res.data.status === "success") {
        setMessage("Middleware order updated.");
        fetchMiddlewares();
      } else {
        setError(res.data.error || "Failed to reorder middlewares.");
      }
    } catch (e) {
      setError("Error reordering middlewares: " + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "2rem auto" }}>
      <h2>Middleware Manager</h2>
      {loading ? (
        <div>Loading middlewares...</div>
      ) : (
        <table border="1" cellPadding="8" style={{ width: "100%", marginBottom: "2rem" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Enabled</th>
              <th>Priority</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {middlewares.map((mw, idx) => (
              <tr key={mw.name}>
                <td>{mw.name}</td>
                <td>{mw.type}</td>
                <td>{mw.enabled ? "Yes" : "No"}</td>
                <td>{mw.priority}</td>
                <td>{mw.description}</td>
                <td>
                  <button
                    onClick={() => moveMiddleware(idx, "up")}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveMiddleware(idx, "down")}
                    disabled={idx === middlewares.length - 1}
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => handleDelete(mw.name)}
                    style={{ color: "red", marginLeft: 8 }}
                  >
                    Delete
                  </button>
                  <button onClick={() => toggleEnabled(mw.name)}>
                    {mw.enabled ? "Disable" : "Enable"}
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button onClick={saveOrder} disabled={loading || middlewares.length < 2}>
        Save Order
      </button>

      <h3 style={{ marginTop: 32 }}>Add New Middleware</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          Name*:
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Class Path*:
          <input
            name="class_path"
            value={form.class_path}
            onChange={handleChange}
            required={!form.github_url}
            disabled={!!form.github_url}
          />
        </label>
        <label>
          Order*:
          <input
            name="order"
            type="number"
            min="1"
            value={form.order}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          GitHub URL (optional):
          <input name="github_url" value={form.github_url} onChange={handleChange} />
        </label>
        <button type="submit">Add Middleware</button>
      </form>
      {(message || error) && (
        <div style={{ marginTop: 16, color: error ? "red" : "green" }}>
          {error || message}
        </div>
      )}
    </div>
  );
}