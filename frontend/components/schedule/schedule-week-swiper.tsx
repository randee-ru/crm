"use client";

import { useCallback, useMemo, useRef } from "react";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import { IconChevronLeft, IconChevronRight } from "@/components/ui/app-icon";
import { addDays, formatWeekRange, getMonday, getWeekDays } from "@/lib/schedule-week";

import "swiper/css";

type ScheduleWeekSwiperProps = {
  weekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  children: (weekStart: Date, weekDays: Date[]) => React.ReactNode;
};

export function ScheduleWeekSwiper({ weekStart, onWeekChange, children }: ScheduleWeekSwiperProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const isResetting = useRef(false);

  const weeks = useMemo(
    () => [addDays(weekStart, -7), weekStart, addDays(weekStart, 7)],
    [weekStart],
  );

  const handleSlideChange = useCallback(
    (swiper: SwiperType) => {
      if (isResetting.current) {
        return;
      }
      if (swiper.activeIndex === 0) {
        onWeekChange(addDays(weekStart, -7));
        isResetting.current = true;
        requestAnimationFrame(() => {
          swiper.slideTo(1, 0);
          isResetting.current = false;
        });
        return;
      }
      if (swiper.activeIndex === 2) {
        onWeekChange(addDays(weekStart, 7));
        isResetting.current = true;
        requestAnimationFrame(() => {
          swiper.slideTo(1, 0);
          isResetting.current = false;
        });
      }
    },
    [onWeekChange, weekStart],
  );

  function goToday() {
    onWeekChange(getMonday(new Date()));
    swiperRef.current?.slideTo(1, 0);
  }

  return (
    <div className="schedule-week-swiper">
      <div className="schedule-week-toolbar">
        <div className="schedule-week-toolbar-actions">
          <button
            type="button"
            className="schedule-week-nav"
            aria-label="Предыдущая неделя"
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <IconChevronLeft size={18} />
          </button>
          <button type="button" className="schedule-week-today" onClick={goToday}>
            Сегодня
          </button>
        </div>
        <strong className="schedule-week-range">{formatWeekRange(weekStart)}</strong>
        <button
          type="button"
          className="schedule-week-nav"
          aria-label="Следующая неделя"
          onClick={() => swiperRef.current?.slideNext()}
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      <Swiper
        className="schedule-week-swiper-instance"
        initialSlide={1}
        slidesPerView={1}
        spaceBetween={20}
        speed={300}
        resistanceRatio={0.72}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChangeTransitionEnd={handleSlideChange}
      >
        {weeks.map((start, index) => (
          <SwiperSlide key={`week-slide-${index}`}>
            {children(start, getWeekDays(start))}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
