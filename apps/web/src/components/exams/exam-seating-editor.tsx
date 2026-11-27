"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { ExamSeatingPrint } from "@/components/exams/exam-seating-print";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import type { GradeWithSections } from "@/lib/api";
import {
  createExamSeatingPlan,
  deleteExamSeatingPlan,
  getExamSeatingPlan,
  listExamSeatingPlans,
  updateExamSeatingPlan,
  type ExamSeatingPlan,
  type ExamSeatingPlanListItem,
  type ExamSeatingRoomInput,
} from "@/lib/exam-schedule";

type RoomDraft = {
  key: string;
  name: string;
  roomRef: string;
  capacity: string;
};

type Props = {
  scheduleId: string;
  grades: GradeWithSections[];
  canEdit: boolean;
  schoolName?: string;
  onError: (message: string) => void;
  onSaved: (message: string) => void;
  onRequestPrint: () => void;
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRoom(): RoomDraft {
  return {
    key: newKey(),
    name: "",
    roomRef: "",
    capacity: "33",
  };
}

export function ExamSeatingEditor({
  scheduleId,
  grades,
  canEdit,
  schoolName,
  onError,
  onSaved,
  onRequestPrint,
}: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const defaultTitle = t("examSeatingUi.defaultSeatingTitle");
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<ExamSeatingPlanListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [plan, setPlan] = useState<ExamSeatingPlan | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [notes, setNotes] = useState("");
  const [sourceGradeIds, setSourceGradeIds] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomDraft[]>([
    emptyRoom(),
    emptyRoom(),
    emptyRoom(),
  ]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadList = useCallback(async () => {
    const rows = await listExamSeatingPlans(scheduleId);
    setPlans(rows);
    return rows;
  }, [scheduleId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    void listExamSeatingPlans(scheduleId)
      .then(async (rows) => {
        if (cancelled) return;
        setPlans(rows);
        if (rows[0]) {
          setSelectedId(rows[0].id);
          const full = await getExamSeatingPlan(scheduleId, rows[0].id);
          if (cancelled) return;
          applyPlan(full);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          onError(
            err instanceof Error ? err.message : t("examSeatingUi.loadSeatingFailed"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scheduleId, onError]);

  function applyPlan(full: ExamSeatingPlan) {
    setPlan(full);
    setSelectedId(full.id);
    setTitle(full.title);
    setNotes(full.notes ?? "");
    setSourceGradeIds(full.sourceGradeIds ?? []);
    setRooms(
      full.rooms.map((r) => ({
        key: r.id,
        name: r.name,
        roomRef: r.roomRef ?? "",
        capacity: String(r.capacity),
      })),
    );
  }

  async function selectPlan(id: string) {
    if (!id) {
      startNew();
      return;
    }
    setBusy(true);
    onError("");
    try {
      const full = await getExamSeatingPlan(scheduleId, id);
      applyPlan(full);
    } catch (err) {
      onError(err instanceof Error ? err.message : t("examSeatingUi.loadPlanFailed"));
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    setPlan(null);
    setSelectedId("");
    setTitle(defaultTitle);
    setNotes("");
    setSourceGradeIds(grades.slice(0, 2).map((g) => g.id));
    setRooms([emptyRoom(), emptyRoom(), emptyRoom()]);
  }

  function toggleGrade(id: string) {
    setSourceGradeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function updateRoom(key: string, patch: Partial<RoomDraft>) {
    setRooms((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRoom() {
    setRooms((prev) => [...prev, emptyRoom()]);
  }

  function removeRoom(key: string) {
    setRooms((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  function roomPayload(): ExamSeatingRoomInput[] {
    return rooms.map((r) => ({
      name: r.name.trim(),
      roomRef: r.roomRef.trim() || null,
      capacity: Number(r.capacity) || 33,
    }));
  }

  async function onGenerate() {
    if (!canEdit) return;
    setBusy(true);
    onError("");
    try {
      const body = {
        title: title.trim() || defaultTitle,
        notes: notes.trim() || null,
        sourceGradeIds,
        rooms: roomPayload(),
      };
      const full = plan
        ? await updateExamSeatingPlan(scheduleId, plan.id, body)
        : await createExamSeatingPlan(scheduleId, body);
      applyPlan(full);
      await loadList();
      onSaved(
        plan
          ? t("examSeatingUi.seatingRedistributed")
          : t("examSeatingUi.seatingGenerated"),
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : t("examSeatingUi.generateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!plan || !canEdit) return;
    setBusy(true);
    onError("");
    try {
      await deleteExamSeatingPlan(scheduleId, plan.id);
      setDeleteOpen(false);
      const rows = await loadList();
      if (rows[0]) {
        const full = await getExamSeatingPlan(scheduleId, rows[0].id);
        applyPlan(full);
      } else {
        startNew();
      }
      onSaved(t("examSeatingUi.seatingDeleted"));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("examSeatingUi.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="muted">{t("examSeatingUi.loadingSeating")}</p>;
  }

  return (
    <div className="ex-seat">
      <div className="ex-seat__toolbar no-print">
        <label className="ex-portal__pick">
          <span>{t("examSeatingUi.plan")}</span>
          <select
            value={selectedId}
            onChange={(e) => void selectPlan(e.target.value)}
            disabled={busy}
          >
            <option value="">{t("examSeatingUi.newPlanOption")}</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ·{" "}
                {t("examSeatingUi.studentsCount", {
                  count: p.rooms.reduce(
                    (n, r) => n + (r._count?.assignments ?? 0),
                    0,
                  ),
                })}
              </option>
            ))}
          </select>
        </label>
        <div className="ex-seat__actions">
          {canEdit ? (
            <button
              type="button"
              className="ex-btn ex-btn--ghost"
              disabled={busy}
              onClick={startNew}
            >
              {t("examSeatingUi.new")}
            </button>
          ) : null}
          {plan ? (
            <button
              type="button"
              className="ex-btn ex-btn--ghost"
              disabled={!plan}
              onClick={onRequestPrint}
            >
              {t("examSeatingUi.printLists")}
            </button>
          ) : null}
          {canEdit && plan ? (
            <button
              type="button"
              className="ex-btn ex-btn--ghost"
              disabled={busy}
              onClick={() => setDeleteOpen(true)}
            >
              {t("common.delete")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="ex-seat__form no-print">
        <label className="ex-field">
          {t("examSeatingUi.title")}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit || busy}
          />
        </label>
        <label className="ex-field">
          {t("examSeatingUi.notes")}
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("examSeatingUi.optional")}
            disabled={!canEdit || busy}
          />
        </label>

        <fieldset className="ex-seat__grades">
          <legend>{t("examSeatingUi.sourceGrades")}</legend>
          <div className="ex-seat__grade-grid">
            {grades.map((g) => (
              <label key={g.id} className="ex-seat__grade">
                <input
                  type="checkbox"
                  checked={sourceGradeIds.includes(g.id)}
                  onChange={() => toggleGrade(g.id)}
                  disabled={!canEdit || busy}
                />
                <span>{g.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="ex-seat__rooms">
          <div className="ex-seat__rooms-head">
            <h3>{t("examSeatingUi.examRooms")}</h3>
            {canEdit ? (
              <button
                type="button"
                className="ex-btn ex-btn--ghost"
                disabled={busy}
                onClick={addRoom}
              >
                {t("examSeatingUi.addRoom")}
              </button>
            ) : null}
          </div>
          {rooms.map((room, idx) => (
            <div key={room.key} className="ex-seat__room-row">
              <label className="ex-field">
                {t("examSeatingUi.roomName")}
                <input
                  value={room.name}
                  placeholder={t("examSeatingUi.roomNamePlaceholder", {
                    n: idx + 1,
                  })}
                  onChange={(e) => updateRoom(room.key, { name: e.target.value })}
                  disabled={!canEdit || busy}
                />
              </label>
              <label className="ex-field">
                {t("examSeatingUi.roomRef")}
                <input
                  value={room.roomRef}
                  placeholder={t("examSeatingUi.roomRefPlaceholder")}
                  onChange={(e) => updateRoom(room.key, { roomRef: e.target.value })}
                  disabled={!canEdit || busy}
                />
              </label>
              <label className="ex-field ex-field--narrow">
                {t("examSeatingUi.capacity")}
                <input
                  type="number"
                  min={1}
                  value={room.capacity}
                  onChange={(e) => updateRoom(room.key, { capacity: e.target.value })}
                  disabled={!canEdit || busy}
                />
              </label>
              {canEdit ? (
                <button
                  type="button"
                  className="ex-slot__remove"
                  disabled={busy || rooms.length <= 1}
                  onClick={() => removeRoom(room.key)}
                  aria-label={t("examSeatingUi.removeRoomAria")}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {canEdit ? (
          <button
            type="button"
            className="ex-btn ex-btn--primary"
            disabled={busy}
            onClick={() => void onGenerate()}
          >
            {busy
              ? t("examSeatingUi.working")
              : plan
                ? t("examSeatingUi.redistribute")
                : t("examSeatingUi.generateSeating")}
          </button>
        ) : null}
      </div>

      {plan ? (
        <ExamSeatingPrint plan={plan} schoolName={schoolName} />
      ) : (
        <p className="ex-portal__empty no-print">{t("examSeatingUi.seatingEmpty")}</p>
      )}

      <AppConfirmDialog
        open={deleteOpen}
        tone="danger"
        title={t("examSeatingUi.deleteSeatingTitle")}
        message={t("examSeatingUi.deleteSeatingMessage")}
        confirmLabel={t("common.delete")}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => !busy && setDeleteOpen(false)}
      />
    </div>
  );
}
