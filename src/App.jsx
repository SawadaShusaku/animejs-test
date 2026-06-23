import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Box,
  Grid3X3,
  Move,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Route,
  Timer,
} from 'lucide-react'
import {
  animate,
  createAnimatable,
  createDrawable,
  createDraggable,
  createMotionPath,
  createScope,
  createTimer,
  createTimeline,
  morphTo,
  onScroll,
  spring,
  stagger,
  waapi,
} from 'animejs'
import './App.css'

const groups = [
  {
    id: 'core',
    title: 'Core motion',
    label: '基本',
    icon: Box,
    description: 'CSS transform、色、キーフレーム、イージングを確認。',
  },
  {
    id: 'orchestration',
    title: 'Orchestration',
    label: '構成',
    icon: Activity,
    description: 'stagger、timeline、timerで複数要素を制御。',
  },
  {
    id: 'svg',
    title: 'SVG toolset',
    label: 'SVG',
    icon: Route,
    description: '線描画、モーションパス、パスモーフィング。',
  },
  {
    id: 'interaction',
    title: 'Interaction',
    label: '操作',
    icon: MousePointer2,
    description: 'drag、scroll同期、scopeのレスポンシブ動作。',
  },
]

const demos = [
  {
    group: 'core',
    title: 'Transform and color',
    api: 'animate',
    summary: '個別CSS transform、色、compositionを一つのAPIで制御。',
  },
  {
    group: 'core',
    title: 'Keyframes and easing',
    api: 'animate + ease',
    summary: '同じ距離を違うイージングで動かし、速度感の差を比較。',
  },
  {
    group: 'core',
    title: 'Object value tween',
    api: 'animate object',
    summary: 'DOMではないJSオブジェクトの数値を補間してUIへ反映。',
  },
  {
    group: 'orchestration',
    title: 'Stagger grid',
    api: 'stagger',
    summary: 'グリッド座標と中心起点を使った遅延・値の分散。',
  },
  {
    group: 'orchestration',
    title: 'Timeline sequence',
    api: 'createTimeline',
    summary: '複数のステップを時刻指定とラベル感覚で束ねる。',
  },
  {
    group: 'orchestration',
    title: 'Timer state',
    api: 'createTimer',
    summary: '描画とUI値をタイマーで同期し、progressを可視化。',
  },
  {
    group: 'orchestration',
    title: 'Timeline callbacks',
    api: 'timeline.call',
    summary: 'シーケンス途中のコールバックで状態表示も同期。',
  },
  {
    group: 'svg',
    title: 'SVG drawing',
    api: 'createDrawable',
    summary: 'pathのstrokeを描画量としてアニメーション。',
  },
  {
    group: 'svg',
    title: 'Motion path',
    api: 'createMotionPath',
    summary: 'SVGパス上にDOM要素を追従させ、角度も連動。',
  },
  {
    group: 'svg',
    title: 'Path morph',
    api: 'morphTo',
    summary: '同じSVG内の別パスへ滑らかに形状変換。',
  },
  {
    group: 'svg',
    title: 'SVG attributes',
    api: 'animate attrs',
    summary: 'SVG要素の属性値を直接アニメーション。',
  },
  {
    group: 'interaction',
    title: 'Draggable spring',
    api: 'createDraggable',
    summary: 'コンテナ内ドラッグ、スナップ、release springを確認。',
  },
  {
    group: 'interaction',
    title: 'Scroll sync',
    api: 'onScroll',
    summary: '横スクロール量にアニメーション進行を同期。',
  },
  {
    group: 'interaction',
    title: 'Scope media query',
    api: 'createScope',
    summary: '同じ要素をビューポート条件で別方向に動かす。',
  },
  {
    group: 'interaction',
    title: 'Pointer follow',
    api: 'createAnimatable',
    summary: 'ポインター位置を追う即応的なプロパティ更新。',
  },
  {
    group: 'core',
    title: 'WAAPI bridge',
    api: 'waapi.animate',
    summary: 'Web Animations API向けの軽量なアニメーション。',
  },
]

const cleanupItem = (item) => {
  if (!item) return
  if (typeof item.revert === 'function') {
    item.revert()
    return
  }
  if (typeof item.cancel === 'function') {
    item.cancel()
  }
}

function SectionHeader({ group }) {
  const Icon = group.icon

  return (
    <header className="section-header">
      <div className="section-heading">
        <span className="section-icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <div>
          <p className="eyebrow">{group.label}</p>
          <h2>{group.title}</h2>
        </div>
      </div>
      <p>{group.description}</p>
    </header>
  )
}

function DemoCard({ demo, children, compact = false }) {
  return (
    <article className={compact ? 'demo-card compact' : 'demo-card'}>
      <header className="demo-card-header">
        <div>
          <p className="api-label">{demo.api}</p>
          <h3>{demo.title}</h3>
        </div>
        <p>{demo.summary}</p>
      </header>
      <div className="demo-surface">{children}</div>
    </article>
  )
}

function App() {
  const rootRef = useRef(null)
  const playbackItemsRef = useRef([])
  const isPausedRef = useRef(false)
  const [runId, setRunId] = useState(0)
  const [activeGroup, setActiveGroup] = useState('all')
  const [isPaused, setIsPaused] = useState(false)

  const setPlaybackPaused = (nextPaused) => {
    isPausedRef.current = nextPaused
    setIsPaused(nextPaused)

    playbackItemsRef.current.forEach((item) => {
      const method = nextPaused ? item?.pause : item?.resume
      if (typeof method === 'function') {
        method.call(item)
      }
    })
  }

  const replayAll = () => {
    isPausedRef.current = false
    setIsPaused(false)
    setRunId((value) => value + 1)
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const items = []
    const scopedAnimations = []
    const add = (item) => {
      items.push(item)
      return item
    }
    const q = (selector) => root.querySelector(selector)
    const qa = (selector) => [...root.querySelectorAll(selector)]
    const has = (selector) => qa(selector).length > 0

    if (has('.transform-swatch')) {
      add(
        animate(qa('.transform-swatch'), {
        x: stagger([-18, 18]),
        y: stagger([18, -18]),
        rotate: stagger([-16, 16]),
        scale: [0.88, 1],
        backgroundColor: (_target, index) => ['#1f8a70', '#d95d39', '#2b4c7e', '#e3a72f'][index],
        borderRadius: stagger(['8px', '26px']),
        delay: stagger(90),
        duration: 1300,
        loop: true,
        alternate: true,
        ease: 'inOut(3)',
        composition: 'blend',
        }),
      )
    }

    qa('.runner').forEach((runner, index) => {
      add(
        animate(runner, {
          x: [0, 180],
          rotate: [0, 360],
          duration: 1600,
          loop: true,
          alternate: true,
          ease: ['outElastic(1, .55)', 'inOutQuad', spring({ stiffness: 90, damping: 12 })][index],
        }),
      )
    })

    const objectValue = q('.object-value')
    const objectMeter = q('.object-meter span')
    if (objectValue && objectMeter) {
      const target = { value: 18 }
      add(
        animate(target, {
          value: 128,
          duration: 1800,
          loop: true,
          alternate: true,
          ease: 'inOutQuad',
          onUpdate: () => {
            const value = Math.round(target.value)
            objectValue.textContent = value.toString()
            objectMeter.style.width = `${(value / 128) * 100}%`
          },
        }),
      )
    }

    if (has('.grid-dot')) {
      add(
        animate(qa('.grid-dot'), {
        scale: stagger([1.35, 0.55], { grid: [7, 7], from: 'center' }),
        opacity: stagger([1, 0.45], { grid: [7, 7], from: 'center' }),
        backgroundColor: stagger(['#1f8a70', '#e3a72f'], { grid: [7, 7], from: 'center' }),
        delay: stagger(38, { grid: [7, 7], from: 'center' }),
        duration: 900,
        loop: true,
        alternate: true,
        ease: 'inOutQuad',
        }),
      )
    }

    if (has('.timeline-bar')) {
      add(
        createTimeline({
        defaults: { duration: 720, ease: 'inOutCubic' },
        loop: true,
        loopDelay: 400,
        })
        .add(qa('.timeline-bar'), { scaleX: [0.18, 1], delay: stagger(110) })
        .add(q('.timeline-cursor'), { x: ['0%', 'calc(100% - 18px)'], duration: 1050 }, '<')
        .add(qa('.timeline-node'), { y: [0, -18, 0], scale: [1, 1.25, 1], delay: stagger(80) }, '-=460')
        .add(qa('.timeline-bar'), { scaleX: [1, 0.35], delay: stagger(80) }, '+=120'),
      )
    }

    const callbackStatus = q('.callback-status')
    if (has('.callback-step') && callbackStatus) {
      add(
        createTimeline({
          defaults: { duration: 520, ease: 'inOutQuad' },
          loop: true,
          loopDelay: 420,
        })
          .call(() => {
            callbackStatus.textContent = 'prepare'
          })
          .add(qa('.callback-step'), { scale: [0.82, 1], opacity: [0.35, 1], delay: stagger(90) })
          .call(() => {
            callbackStatus.textContent = 'commit'
          }, '+=80')
          .add(qa('.callback-step'), { y: [0, -16, 0], delay: stagger(70) })
          .call(() => {
            callbackStatus.textContent = 'settle'
          }, '+=80')
          .add(qa('.callback-step'), { scale: [1, 0.82], opacity: [1, 0.35], delay: stagger(70) }),
      )
    }

    const progressValue = q('.timer-value')
    const timerDial = q('.timer-dial')
    if (progressValue) {
      const updateTimerDisplay = (progress) => {
        const roundedProgress = Math.round(progress)
        root.style.setProperty('--timer-progress', `${progress}%`)
        root.style.setProperty('--timer-rotation', `${progress * 3.6}deg`)
        progressValue.textContent = `${roundedProgress}%`
      }

      add(
        createTimer({
          duration: 2400,
          loop: true,
          autoplay: true,
          onBegin: () => updateTimerDisplay(0),
          onUpdate: (self) => {
            updateTimerDisplay(self.iterationProgress * 100)
          },
        }),
      )

      if (timerDial) {
        timerDial.style.setProperty('--timer-rotation', '0deg')
      }
    }

    const drawLine = q('.draw-line')
    if (drawLine) {
      add(
        animate(createDrawable(drawLine), {
        draw: ['0 0', '0 1', '1 1'],
        duration: 1800,
        loop: true,
        loopDelay: 360,
        ease: 'inOut(3)',
        }),
      )
    }

    const pathOrb = q('.path-orb')
    const motionTrack = q('.motion-track')
    if (pathOrb && motionTrack) {
      add(
        animate(pathOrb, {
        ...createMotionPath(motionTrack),
        duration: 2600,
        loop: true,
        ease: 'linear',
        }),
      )
    }

    const morphSource = q('.morph-source')
    const morphTarget = q('.morph-target')
    if (morphSource && morphTarget) {
      add(
        animate(morphSource, {
        d: morphTo(morphTarget),
        duration: 1600,
        loop: true,
        alternate: true,
        ease: 'inOutQuad',
        }),
      )
    }

    const attrCircle = q('.attr-circle')
    const attrBar = q('.attr-bar')
    if (attrCircle && attrBar) {
      add(
        animate(attrCircle, {
          cx: [48, 176],
          r: [15, 28],
          fill: ['#2b4c7e', '#1f8a70'],
          duration: 1400,
          loop: true,
          alternate: true,
          ease: 'inOutQuad',
        }),
      )
      add(
        animate(attrBar, {
          width: [54, 166],
          opacity: [0.45, 1],
          duration: 1400,
          loop: true,
          alternate: true,
          ease: 'inOutQuad',
        }),
      )
    }

    const dragTarget = q('.drag-target')
    const dragZone = q('.drag-zone')
    if (dragTarget && dragZone) {
      add(
        createDraggable(dragTarget, {
        container: dragZone,
        snap: 20,
        releaseEase: spring({ stiffness: 160, damping: 14 }),
        cursor: { onHover: 'grab', onGrab: 'grabbing' },
        }),
      )
    }

    const scrollBlock = q('.scroll-block')
    const scrollShell = q('.scroll-shell')
    const scrollTrack = q('.scroll-track')
    if (scrollBlock && scrollShell && scrollTrack) {
      const scrollProgress = q('.scroll-progress span')
      const scrollValue = q('.scroll-value')

      const updateScrollDemo = () => {
        const maxScroll = scrollShell.scrollWidth - scrollShell.clientWidth
        const ratio = maxScroll > 0 ? scrollShell.scrollLeft / maxScroll : 0
        const travel = Math.max(0, scrollShell.clientWidth - scrollBlock.offsetWidth - 58)
        const progress = Math.min(1, Math.max(0, ratio))

        scrollBlock.style.transform = `translateX(${travel * progress}px) rotate(${270 * progress}deg)`
        if (scrollProgress) {
          scrollProgress.style.width = `${progress * 100}%`
        }
        if (scrollValue) {
          scrollValue.textContent = `${Math.round(progress * 100)}%`
        }
      }

      updateScrollDemo()

      const scrollObserver = onScroll({
          container: scrollShell,
          target: scrollTrack,
          axis: 'x',
          enter: 0,
          leave: 'max',
          onUpdate: updateScrollDemo,
        })

      scrollShell.addEventListener('scroll', updateScrollDemo, { passive: true })
      add({
        revert: () => {
          scrollShell.removeEventListener('scroll', updateScrollDemo)
          scrollObserver.revert()
        },
      })
    }

    const magnetZone = q('.magnet-zone')
    const magnetTarget = q('.magnet-target')
    if (magnetZone && magnetTarget) {
      const magnet = createAnimatable(magnetTarget, {
        x: { duration: 520, ease: spring({ stiffness: 160, damping: 18 }) },
        y: { duration: 520, ease: spring({ stiffness: 160, damping: 18 }) },
        rotate: { duration: 420, ease: 'out(3)' },
      })

      const moveMagnet = (event) => {
        const rect = magnetZone.getBoundingClientRect()
        const x = event.clientX - rect.left - magnetTarget.offsetWidth / 2
        const y = event.clientY - rect.top - magnetTarget.offsetHeight / 2
        magnet.x(Math.max(0, Math.min(rect.width - magnetTarget.offsetWidth, x)))
        magnet.y(Math.max(0, Math.min(rect.height - magnetTarget.offsetHeight, y)))
        magnet.rotate((x - rect.width / 2) / 4)
      }
      const resetMagnet = () => {
        magnet.x(126)
        magnet.y(58)
        magnet.rotate(0)
      }

      resetMagnet()
      magnetZone.addEventListener('pointermove', moveMagnet)
      magnetZone.addEventListener('pointerleave', resetMagnet)
      add({
        revert: () => {
          magnetZone.removeEventListener('pointermove', moveMagnet)
          magnetZone.removeEventListener('pointerleave', resetMagnet)
          magnet.revert()
        },
      })
    }

    if (has('.scope-chip')) {
      add(
        createScope({
        root,
        mediaQueries: {
          narrow: '(max-width: 720px)',
        },
        }).add(({ matches }) => {
        const animation = animate(qa('.scope-chip'), {
          x: matches.narrow ? stagger([-10, 10]) : 0,
          y: matches.narrow ? 0 : stagger([-12, 12]),
          scale: [0.92, 1.08],
          delay: stagger(120),
          loop: true,
          alternate: true,
          duration: 900,
          ease: 'inOutQuad',
        })
        scopedAnimations.push(animation)

        return () => animation.revert()
        }),
      )
    }

    const waapiTile = q('.waapi-tile')
    if (waapiTile) {
      add(
        waapi.animate(waapiTile, {
          x: ['0px', '112px', '112px', '0px', '0px'],
          y: ['0px', '0px', '58px', '58px', '0px'],
          rotate: ['0deg', '90deg', '180deg', '270deg', '360deg'],
          backgroundColor: ['#d95d39', '#2b4c7e', '#1f8a70', '#e3a72f', '#d95d39'],
          duration: 2600,
          loop: true,
          ease: 'linear',
        }),
      )
    }

    const playbackItems = [...items, ...scopedAnimations]
    playbackItemsRef.current = playbackItems

    if (isPausedRef.current) {
      playbackItems.forEach((item) => {
        if (typeof item?.pause === 'function') {
          item.pause()
        }
      })
    }

    return () => {
      if (playbackItemsRef.current === playbackItems) {
        playbackItemsRef.current = []
      }
      root.style.removeProperty('--timer-progress')
      items.reverse().forEach(cleanupItem)
    }
  }, [runId, activeGroup])

  const visibleGroups = activeGroup === 'all' ? groups : groups.filter((group) => group.id === activeGroup)

  return (
    <main className="app-shell" ref={rootRef}>
      <header className="top-panel">
        <div className="title-block">
          <p className="eyebrow">anime.js 4.5.0 / React</p>
          <h1>Animation feature bench</h1>
          <p>
            anime.jsの主要機能を、機能グループごとに一画面で確認できるサンプルサイトです。
          </p>
        </div>
        <div className="top-actions" aria-label="Playback controls">
          <button type="button" className="icon-button primary" onClick={replayAll}>
            <RotateCcw size={18} />
            <span>Replay all</span>
          </button>
          <button
            type="button"
            className={isPaused ? 'icon-button active' : 'icon-button'}
            aria-pressed={isPaused}
            disabled={isPaused}
            onClick={() => setPlaybackPaused(true)}
          >
            <Pause size={17} />
            <span>Pause motion</span>
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!isPaused}
            onClick={() => setPlaybackPaused(false)}
          >
            <Play size={17} />
            <span>Resume motion</span>
          </button>
        </div>
      </header>

      <nav className="group-tabs" aria-label="Feature groups">
        <button
          type="button"
          className={activeGroup === 'all' ? 'active' : ''}
          onClick={() => setActiveGroup('all')}
        >
          All
        </button>
        {groups.map((group) => (
          <button
            type="button"
            className={activeGroup === group.id ? 'active' : ''}
            key={group.id}
            onClick={() => setActiveGroup(group.id)}
          >
            {group.label}
          </button>
        ))}
      </nav>

      {visibleGroups.map((group) => (
        <section className="feature-section" key={group.id}>
          <SectionHeader group={group} />
          <div className="demo-grid">
            {demos
              .filter((demo) => demo.group === group.id)
              .map((demo) => (
                <DemoSlot key={demo.title} demo={demo} />
              ))}
          </div>
        </section>
      ))}
    </main>
  )
}

function DemoSlot({ demo }) {
  if (demo.title === 'Transform and color') {
    return (
      <DemoCard demo={demo}>
        <div className="swatch-row" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="transform-swatch" key={index} />
          ))}
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Keyframes and easing') {
    return (
      <DemoCard demo={demo}>
        <div className="runner-stack" aria-hidden="true">
          {['Elastic', 'Quad', 'Spring'].map((label) => (
            <div className="runner-lane" key={label}>
              <span>{label}</span>
              <i className="runner" />
            </div>
          ))}
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Object value tween') {
    return (
      <DemoCard demo={demo}>
        <div className="object-demo" aria-hidden="true">
          <span className="object-label">value</span>
          <strong className="object-value">18</strong>
          <div className="object-meter">
            <span />
          </div>
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Stagger grid') {
    return (
      <DemoCard demo={demo}>
        <div className="dot-grid" aria-hidden="true">
          {Array.from({ length: 49 }, (_, index) => (
            <span className="grid-dot" key={index} />
          ))}
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Timeline sequence') {
    return (
      <DemoCard demo={demo}>
        <div className="timeline-stage" aria-hidden="true">
          <div className="timeline-cursor" />
          {[0, 1, 2].map((index) => (
            <div className="timeline-row" key={index}>
              <span className="timeline-node" />
              <span className="timeline-bar" />
            </div>
          ))}
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Timeline callbacks') {
    return (
      <DemoCard demo={demo}>
        <div className="callback-demo" aria-hidden="true">
          <div className="callback-row">
            {['A', 'B', 'C', 'D'].map((label) => (
              <span className="callback-step" key={label}>
                {label}
              </span>
            ))}
          </div>
          <strong className="callback-status">prepare</strong>
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Timer state') {
    return (
      <DemoCard demo={demo} compact>
        <div className="timer-demo" aria-hidden="true">
          <span className="timer-dial">
            <Timer size={24} />
          </span>
          <div className="timer-meter">
            <span />
          </div>
          <strong className="timer-value">0%</strong>
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'SVG drawing') {
    return (
      <DemoCard demo={demo}>
        <svg className="svg-stage draw-stage" viewBox="0 0 260 120" aria-hidden="true">
          <path
            className="draw-line"
            d="M18 82 C46 16, 82 16, 112 72 S178 122, 242 34"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>
      </DemoCard>
    )
  }

  if (demo.title === 'Motion path') {
    return (
      <DemoCard demo={demo}>
        <div className="motion-wrap" aria-hidden="true">
          <svg className="svg-stage" viewBox="0 0 280 130">
            <path className="motion-track" d="M28 94 C70 18, 126 18, 146 74 S222 128, 252 42" />
          </svg>
          <span className="path-orb">
            <Route size={18} />
          </span>
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Path morph') {
    return (
      <DemoCard demo={demo}>
        <svg className="svg-stage morph-stage" viewBox="0 0 220 150" aria-hidden="true">
          <path
            className="morph-source"
            d="M110 22 C150 22 184 48 184 82 C184 122 152 132 110 132 C68 132 36 122 36 82 C36 48 70 22 110 22 Z"
          />
          <path
            className="morph-target"
            d="M110 16 L132 64 L186 70 L146 104 L158 136 L110 118 L62 136 L74 104 L34 70 L88 64 Z"
          />
        </svg>
      </DemoCard>
    )
  }

  if (demo.title === 'SVG attributes') {
    return (
      <DemoCard demo={demo}>
        <svg className="svg-stage attr-stage" viewBox="0 0 220 150" aria-hidden="true">
          <rect className="attr-bar" x="26" y="102" width="54" height="16" rx="8" />
          <circle className="attr-circle" cx="48" cy="62" r="15" />
          <path className="attr-guide" d="M36 62 H184" />
        </svg>
      </DemoCard>
    )
  }

  if (demo.title === 'Draggable spring') {
    return (
      <DemoCard demo={demo}>
        <div className="drag-zone">
          <div className="drag-target">
            <Move size={22} />
          </div>
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Scroll sync') {
    return (
      <DemoCard demo={demo}>
        <div className="scroll-shell" tabIndex="0" aria-label="Horizontal scroll animation demo">
          <div className="scroll-track">
            <span className="scroll-block" />
            <div className="scroll-panel">
              <div className="scroll-progress">
                <span />
              </div>
              <strong className="scroll-value">0%</strong>
            </div>
          </div>
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Scope media query') {
    return (
      <DemoCard demo={demo}>
        <div className="scope-row" aria-hidden="true">
          {['S', 'C', 'O', 'P', 'E'].map((letter) => (
            <span className="scope-chip" key={letter}>
              {letter}
            </span>
          ))}
        </div>
      </DemoCard>
    )
  }

  if (demo.title === 'Pointer follow') {
    return (
      <DemoCard demo={demo}>
        <div className="magnet-zone" aria-label="Pointer follow demo">
          <span className="magnet-target">
            <MousePointer2 size={22} />
          </span>
        </div>
      </DemoCard>
    )
  }

  return (
    <DemoCard demo={demo}>
      <div className="waapi-stage" aria-hidden="true">
        <Grid3X3 size={44} />
        <span className="waapi-tile" />
      </div>
    </DemoCard>
  )
}

export default App
