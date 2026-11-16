import { Skeleton, TextSkeleton } from "./Skeleton";
import "./loading.css";

/** A single KPI / stat card placeholder. */
export function KpiSkeleton() {
  return (
    <div className="ld-kpi" aria-hidden="true">
      <div className="ld-kpi-top">
        <div className="ld-text" style={{ flex: 1 }}>
          <span className="skeleton ld-line" style={{ width: "55%" }} />
        </div>
        <span className="skeleton ld-kpi-icon" />
      </div>
      <span className="skeleton ld-kpi-value" />
      <span className="skeleton ld-kpi-foot" />
    </div>
  );
}

/** A row of KPI cards. */
export function KpiGridSkeleton({ count = 4 }) {
  return (
    <div className="ld-grid-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <KpiSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Generic page shell placeholder — a heading block, a toolbar and a body.
 * Use when a page has no more specific structure worth mirroring.
 */
export function PageSkeleton({ toolbar = true, blocks = 3, className = "" }) {
  return (
    <div className={`ld-page ${className}`.trim()} aria-busy="true" aria-hidden="true">
      <div className="ld-page-head">
        <div className="ld-page-head-row">
          <div className="ld-text" style={{ flex: 1, maxWidth: "26rem" }}>
            <span className="skeleton ld-line-lg" style={{ width: "45%" }} />
            <span className="skeleton ld-line" style={{ width: "70%" }} />
          </div>
          <span className="skeleton ld-btn" style={{ width: "8rem" }} />
        </div>
      </div>

      {toolbar ? (
        <div className="ld-table-head" style={{ borderRadius: "var(--radius-lg)" }}>
          <span className="skeleton" style={{ width: "12rem", height: "2.25rem" }} />
          <span className="skeleton" style={{ width: "9rem", height: "2.25rem" }} />
          <span className="skeleton" style={{ width: "9rem", height: "2.25rem" }} />
        </div>
      ) : null}

      <div className="ld-page-body">
        {Array.from({ length: blocks }).map((_, index) => (
          <span
            key={index}
            className="skeleton ld-block"
            style={{ height: index === 0 ? "18rem" : "9rem" }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Admin analytics dashboard placeholder: KPI row, a chart panel, a list
 * panel and a recent-orders table.
 */
export function DashboardSkeleton() {
  return (
    <div className="ld-page" aria-busy="true" aria-hidden="true">
      <KpiGridSkeleton count={4} />

      <div className="ld-grid-2">
        <ChartSkeleton />
        <div className="ld-chart">
          <div className="ld-chart-head">
            <div className="ld-text" style={{ flex: 1 }}>
              <span className="skeleton ld-line" style={{ width: "45%" }} />
              <span className="skeleton ld-line-sm" style={{ width: "70%" }} />
            </div>
          </div>
          <div className="ld-chart-legend">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="ld-chart-legend-row">
                <span className="skeleton ld-chart-legend-dot" />
                <span className="skeleton ld-line" style={{ flex: 1, height: "0.625rem" }} />
                <span className="skeleton ld-line" style={{ width: "2.5rem", height: "0.625rem" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <TableSkeleton rows={5} />
    </div>
  );
}

/** A chart panel placeholder (bar plot + heading). */
export function ChartSkeleton({ height = 180 }) {
  return (
    <div className="ld-chart" aria-hidden="true">
      <div className="ld-chart-head">
        <div className="ld-text" style={{ flex: 1 }}>
          <span className="skeleton ld-line" style={{ width: "40%" }} />
          <span className="skeleton ld-line-sm" style={{ width: "65%" }} />
        </div>
        <span className="skeleton ld-pill" style={{ width: "7rem" }} />
      </div>
      <div className="ld-chart-plot" style={{ height }}>
        {[45, 70, 55, 88, 62, 95, 50, 75].map((value, index) => (
          <span key={index} className="skeleton ld-chart-bar" style={{ height: `${value}%` }} />
        ))}
      </div>
    </div>
  );
}

/** A generic data-table placeholder. */
export function TableSkeleton({ rows = 6, columns = 5, thumb = false }) {
  return (
    <div className="ld-table" aria-hidden="true">
      <div className="ld-table-head">
        {Array.from({ length: columns }).map((_, index) => (
          <span key={index} className="skeleton ld-line" style={{ width: "4.5rem", height: "0.625rem" }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="ld-table-row">
          {thumb ? <span className="skeleton ld-table-thumb" /> : null}
          <div className="ld-table-cell" style={{ flex: 1.4 }}>
            <span className="skeleton ld-line" style={{ width: "60%" }} />
            <span className="skeleton ld-line-sm" style={{ width: "40%" }} />
          </div>
          <div className="ld-table-cell" style={{ flex: 1 }}>
            <span className="skeleton ld-line" style={{ width: "70%" }} />
          </div>
          <div className="ld-table-cell" style={{ flex: 0.7 }}>
            <span className="skeleton ld-pill" style={{ width: "4.5rem" }} />
          </div>
          <div className="ld-table-actions">
            <span className="skeleton ld-table-btn" />
            <span className="skeleton ld-table-btn" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A form placeholder with fields and a save row. */
export function FormSkeleton({ fields = 6, rows = 2 }) {
  return (
    <div className="ld-form" aria-busy="true" aria-hidden="true">
      {Array.from({ length: Math.ceil(fields / rows) }).map((_, group) => (
        <div key={group} className="ld-field-row">
          {Array.from({ length: Math.min(rows, fields - group * rows) }).map((__, field) => (
            <div key={field} className="ld-field">
              <span className="skeleton ld-field-label" />
              <span className="skeleton ld-input" />
            </div>
          ))}
        </div>
      ))}
      <div className="ld-table-actions" style={{ marginLeft: 0 }}>
        <span className="skeleton ld-btn" />
        <span className="skeleton ld-btn" style={{ width: "5.5rem" }} />
      </div>
    </div>
  );
}

/** A profile header + panel placeholder. */
export function ProfileSkeleton() {
  return (
    <div className="ld-profile" aria-busy="true" aria-hidden="true">
      <div className="ld-profile-head">
        <span className="skeleton ld-profile-avatar" />
        <div className="ld-text" style={{ flex: 1 }}>
          <span className="skeleton ld-line-lg" style={{ width: "35%" }} />
          <span className="skeleton ld-line" style={{ width: "55%" }} />
        </div>
      </div>
      <FormSkeleton fields={6} />
    </div>
  );
}

/** A settings navigation + form placeholder. */
export function SettingsSkeleton({ tabs = 6 }) {
  return (
    <div className="ld-settings" aria-busy="true" aria-hidden="true">
      <div className="ld-settings-nav">
        {Array.from({ length: tabs }).map((_, index) => (
          <span key={index} className="skeleton ld-settings-nav-item" style={{ width: "85%" }} />
        ))}
      </div>
      <div className="ld-form">
        <TextSkeleton lines={2} />
        <FormSkeleton fields={4} />
      </div>
    </div>
  );
}

/** An admin sidebar navigation placeholder. */
export function SidebarSkeleton({ groups = 3, items = 4 }) {
  return (
    <div className="ld-sidebar" aria-hidden="true">
      {Array.from({ length: groups }).map((_, group) => (
        <div key={group} className="ld-sidebar-group">
          <span className="skeleton ld-line-sm" style={{ width: "40%", height: "0.5rem" }} />
          {Array.from({ length: items }).map((__, item) => (
            <div key={item} className="ld-sidebar-item">
              <span className="skeleton ld-sidebar-icon" />
              <span className="skeleton ld-line" style={{ width: "60%", height: "0.625rem" }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
