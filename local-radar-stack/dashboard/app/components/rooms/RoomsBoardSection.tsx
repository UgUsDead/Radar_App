import Link from "next/link";
import { RoomRow, EventRow, DailyRow } from "../../types/domain";

interface Props {
  needsAttentionOnly: boolean;
  setNeedsAttentionOnly: (value: boolean) => void;
  visibleRooms: RoomRow[];
  sortedRooms: RoomRow[];
  roomStatus: (room: RoomRow) => "ok" | "warn" | "alert";
  daily: DailyRow[];
  roomAlerts: Map<string, EventRow[]>;
  unassigningRadarId: string | null;
  deletingRadarId: string | null;
  deletingRoomId: number | null;
  roomShortcut: (room: RoomRow, action: "ack" | "resolve") => Promise<void>;
  unassignRadar: (radarId: string) => Promise<void>;
  deleteRadar: (radarId: string) => Promise<void>;
  deleteRoom: (room: RoomRow) => Promise<void>;
}

export function RoomsBoardSection({
  needsAttentionOnly,
  setNeedsAttentionOnly,
  visibleRooms,
  sortedRooms,
  roomStatus,
  daily,
  roomAlerts,
  unassigningRadarId,
  deletingRadarId,
  deletingRoomId,
  roomShortcut,
  unassignRadar,
  deleteRadar,
  deleteRoom
}: Props) {
  const statusLabel = (status: "ok" | "warn" | "alert") => {
    if (status === "alert") return "ALERT";
    if (status === "warn") return "CHECK";
    return "OK";
  };

  return (
    <section className="panel">
      <h2>Quadro de Estado dos Quartos</h2>
      <div className="room-board-toolbar">
        <label>
          <input
            type="checkbox"
            checked={needsAttentionOnly}
            onChange={(event) => setNeedsAttentionOnly(event.target.checked)}
          />
          Apenas necessita de atenção
        </label>
        <span className="muted">A mostrar {visibleRooms.length} de {sortedRooms.length} quartos</span>
      </div>
      <div className="grid rooms">
        {visibleRooms.map((room) => {
          const status = roomStatus(room);
          const stat = daily.find((d) => d.room_name === room.name);
          const roomActiveAlerts = roomAlerts.get(room.name) ?? [];
          const hasNewRoomAlert = roomActiveAlerts.some((event) => (event.alert_status ?? "new") === "new");
          return (
            <article className="room-card" key={room.id}>
              <div className="room-top">
                <h3>{room.name}</h3>
                <span className={`badge ${status}`}>{statusLabel(status)}</span>
              </div>

              <div className="room-line">
                <strong>Estado de Segurança:</strong> 
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                  room.safety_state === 'urgent' ? 'bg-red-200 text-red-800' :
                  room.safety_state === 'watch' ? 'bg-yellow-200 text-yellow-800' :
                  room.safety_state === 'offline' ? 'bg-gray-200 text-gray-800' :
                  'bg-green-200 text-green-800'
                }`}>
                  {room.safety_state || 'normal'}
                </span>
              </div>
              {room.safety_state !== 'offline' && typeof room.occupancy !== 'undefined' && (
                <div className="room-line">
                  <strong>Ocupação:</strong> {room.occupancy}
                  <span className="text-gray-500 text-xs ml-2">
                     (Inativo: {room.last_activity_sec ? Math.round(room.last_activity_sec) : 0}s)
                  </span>
                </div>
              )}
              <div className="room-line"><strong>Paciente:</strong> {room.patient_name ?? "Não Atribuído"}</div>
              <div className="room-line">
                <strong>Estado do Radar:</strong> {room.radar_id ? (room.radar_status ?? "offline") : "Não Atribuído"}
              </div>
              <div className="room-line"><strong>Distância:</strong> {(stat?.total_distance ?? 0).toFixed(2)} m</div>
              <div className="room-line"><strong>Marcha:</strong> {(stat?.avg_gait_stability ?? 0).toFixed(3)}</div>

              {roomActiveAlerts.length > 0 ? (
                <div className="room-actions">
                  {hasNewRoomAlert ? (
                    <button onClick={() => void roomShortcut(room, "ack")}>Reconhecer alerta</button>
                  ) : null}
                  <button onClick={() => void roomShortcut(room, "resolve")}>Resolver alerta</button>
                </div>
              ) : null}

              {room.patient_id ? <Link href={`/patients/${room.patient_id}`}>Ver detalhes do paciente</Link> : null}

              <div className="room-actions">
                {room.radar_id ? (
                  <>
                    <button
                      className="danger-btn"
                      onClick={() => void unassignRadar(room.radar_id as string)}
                      disabled={unassigningRadarId !== null || deletingRadarId !== null}
                    >
                      {unassigningRadarId === room.radar_id ? "A desatribuir..." : "⛓️‍💥 Desatribuir radar"}
                    </button>
                    <button
                      className="danger-btn"
                      onClick={() => void deleteRadar(room.radar_id as string)}
                      disabled={deletingRadarId !== null || unassigningRadarId !== null}
                    >
                      {deletingRadarId === room.radar_id ? "A eliminar..." : "🗑 Eliminar radar"}
                    </button>
                  </>
                ) : null}
                <button className="danger-btn" onClick={() => void deleteRoom(room)} disabled={deletingRoomId !== null}>
                  {deletingRoomId === room.id ? "A eliminar quarto..." : "🗑 Eliminar quarto"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
