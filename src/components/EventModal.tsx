import { useState } from 'react';
import type { Sport, TrackedEvent } from '../types';

const ACTIVITY_TYPES: Sport[] = [
  'Run',
  'Ride',
  'Walk',
  'Hike',
  'Padel',
  'Soccer',
  'Rowing',
  'Triathlon',
];

export function EventModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (event: Omit<TrackedEvent, 'id'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [activityType, setActivityType] = useState<Sport>('Run');
  const [date, setDate] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [targetTime, setTargetTime] = useState('');
  const [officialTime, setOfficialTime] = useState('');
  const [officialResultsUrl, setOfficialResultsUrl] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;
    onSave({
      title,
      distanceKm: Number(distanceKm) || 0,
      activityType,
      date,
      link: link || undefined,
      imageUrl: imageUrl || undefined,
      description: description || undefined,
      isMilestone: isMilestone || undefined,
      targetTime: isMilestone && targetTime ? targetTime : undefined,
      officialTime: officialTime || undefined,
      officialResultsUrl: officialResultsUrl || undefined,
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Add event</h3>
        <form onSubmit={submit} className="modal-form">
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Distance (km)
            <input
              type="number"
              step="0.01"
              min="0"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </label>
          <label>
            Activity type
            <select value={activityType} onChange={(e) => setActivityType(e.target.value as Sport)}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Official website link
            <input
              type="url"
              placeholder="https://…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </label>
          <label>
            Public image URL
            <input
              type="url"
              placeholder="https://…"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </label>
          <label>
            Official chip time (optional)
            <input
              type="text"
              placeholder="e.g. 56:38 or 9:07:36"
              value={officialTime}
              onChange={(e) => setOfficialTime(e.target.value)}
            />
          </label>
          <label>
            Official results link (optional)
            <input
              type="url"
              placeholder="https://…"
              value={officialResultsUrl}
              onChange={(e) => setOfficialResultsUrl(e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              placeholder="Charity/donation info, deliverable breakdown, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="modal-checkbox">
            <input
              type="checkbox"
              checked={isMilestone}
              onChange={(e) => setIsMilestone(e.target.checked)}
            />
            Milestone goal
          </label>
          {isMilestone ? (
            <label>
              Goal finish time (optional)
              <input
                type="text"
                placeholder="e.g. 2:15:00"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
              />
            </label>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-location">
              Save event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
