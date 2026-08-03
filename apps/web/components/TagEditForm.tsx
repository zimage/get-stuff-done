"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "../lib/trpc";

export interface TagEditValue {
  id: string;
  title: string;
  status: string;
  locationType: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function TagEditForm({ tag, onSaved }: { tag: TagEditValue; onSaved: () => void }) {
  const [title, setTitle] = useState(tag.title);
  const [status, setStatus] = useState(tag.status);
  const [locationType, setLocationType] = useState(tag.locationType);
  const [address, setAddress] = useState(tag.address ?? "");
  const [lat, setLat] = useState(tag.lat != null ? String(tag.lat) : "");
  const [lng, setLng] = useState(tag.lng != null ? String(tag.lng) : "");

  const updateMutation = trpc.tags.update.useMutation({ onSuccess: onSaved });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateMutation.mutate({
      id: tag.id,
      title: title.trim(),
      status: status as "active" | "on_hold" | "dropped",
      locationType: locationType as "anywhere" | "address" | "coordinates",
      address: locationType === "address" ? address.trim() : null,
      lat: locationType === "coordinates" && lat ? Number(lat) : null,
      lng: locationType === "coordinates" && lng ? Number(lng) : null,
    });
  }

  return (
    <form className="detail-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <div className="field-row">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="dropped">Dropped</option>
          </select>
        </label>
        <label>
          Location
          <select value={locationType} onChange={(e) => setLocationType(e.target.value)}>
            <option value="anywhere">Anywhere</option>
            <option value="address">Address</option>
            <option value="coordinates">Coordinates</option>
          </select>
        </label>
      </div>

      {locationType === "address" && (
        <label>
          Address
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St…" />
        </label>
      )}

      {locationType === "coordinates" && (
        <div className="field-row">
          <label>
            Latitude
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
          </label>
          <label>
            Longitude
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
          </label>
        </div>
      )}

      <p className="form-hint">Created {tag.createdAt.toLocaleString()}</p>
      <p className="form-hint">Last changed {tag.updatedAt.toLocaleString()}</p>

      {updateMutation.error && <p className="form-error">{updateMutation.error.message}</p>}

      <div className="form-actions">
        <button type="submit" disabled={updateMutation.isPending}>
          Save
        </button>
      </div>
    </form>
  );
}
