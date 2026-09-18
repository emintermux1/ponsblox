import { useEffect, useRef } from 'react'
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { loopWhileVisible } from './raf.ts'
import { ballSpeed, type SimRuntime } from './sim.ts'

const BRAIN = '/models/brain.glb'
const CHANNELS = 96

function viewFit(camera: PerspectiveCamera, maxDim: number, fill: number) {
  const dist = camera.position.length()
  const vFov = (camera.fov * Math.PI) / 180
  const viewH = 2 * Math.tan(vFov / 2) * dist
  const viewW = viewH * camera.aspect
  return (Math.min(viewW, viewH) * fill) / maxDim
}

export function LiveBrain({ live }: { live: { current: SimRuntime } }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = host.current
    if (!stage) return
    const el = stage

    const scene = new Scene()
    scene.background = new Color(0x000000)
    const camera = new PerspectiveCamera(28, 1, 0.05, 40)
    camera.position.set(0.1, 0.08, 3.55)
    camera.lookAt(0, 0, 0)

    const renderer = new WebGLRenderer({ antialias: true })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setClearColor(0x000000, 1)
    el.appendChild(renderer.domElement)

    const ambient = new AmbientLight(0xfff4ee, 0.48)
    const key = new DirectionalLight(0xfff6ee, 1.55)
    key.position.set(1.4, 1.6, 2.2)
    const fill = new DirectionalLight(0x8ab0d4, 0.42)
    fill.position.set(-2.2, 0.3, -1.2)
    const youGlow = new PointLight(0xffe0c8, 0.2, 6)
    const pagerGlow = new PointLight(0xc8d8ff, 0.2, 6)
    youGlow.position.set(-0.55, 0.2, 0.55)
    pagerGlow.position.set(0.55, 0.2, 0.55)
    scene.add(ambient, key, fill, youGlow, pagerGlow)

    const root = new Group()
    scene.add(root)
    const hold = new Group()
    root.add(hold)

    const skins: MeshStandardMaterial[] = []
    const samples: Vector3[] = []
    const dummy = new Object3D()
    const mat4 = new Matrix4()
    const geo = new SphereGeometry(0.02, 8, 8)
    const mark = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.4,
      roughness: 0.35,
    })
    const field = new InstancedMesh(geo, mark, CHANNELS)
    field.visible = false

    let maxDim = 1
    let gone = false
    const loader = new GLTFLoader()
    loader.load(
      BRAIN,
      (gltf) => {
        if (gone) return
        el.dataset.brain = 'live'
        const model = gltf.scene
        const box = new Box3().setFromObject(model)
        const center = box.getCenter(new Vector3())
        const dim = box.getSize(new Vector3())
        maxDim = Math.max(dim.x, dim.y, dim.z) || 1
        model.position.sub(center)
        hold.add(model)
        hold.scale.setScalar(viewFit(camera, maxDim, 0.46))
        hold.rotation.y = 0.55
        hold.rotation.x = 0.06
        hold.updateWorldMatrix(true, true)
        model.traverse((obj) => {
          if (!(obj instanceof Mesh)) return
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          const nexts = mats.map((raw) => {
            const next = raw.clone()
            if (next instanceof MeshStandardMaterial) {
              next.emissive = new Color(0x141414)
              next.emissiveIntensity = 0.16
              skins.push(next)
            }
            return next
          })
          obj.material = Array.isArray(obj.material) ? nexts : nexts[0]
          const pos = obj.geometry.getAttribute('position')
          if (!pos) return
          const step = Math.max(1, Math.floor(pos.count / 220))
          for (let i = 0; i < pos.count; i += step) {
            const v = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
            obj.localToWorld(v)
            if (v.y > -0.08) samples.push(v.clone())
          }
        })
        samples.sort((a, b) => a.x - b.x)
        const picks = samples.slice(0, CHANNELS)
        for (let i = 0; i < CHANNELS; i++) {
          const p = picks[i] ?? new Vector3()
          dummy.position.copy(p)
          dummy.scale.setScalar(1)
          dummy.updateMatrix()
          field.setMatrixAt(i, dummy.matrix)
        }
        field.instanceMatrix.needsUpdate = true
        field.visible = picks.length > 0
        root.add(field)
      },
      undefined,
      () => {
        el.dataset.brain = 'fail'
      },
    )

    const drag = { on: false, x: 0.08, y: 0.02, lx: 0, ly: 0 }
    function onDown(ev: PointerEvent) {
      drag.on = true
      drag.lx = ev.clientX
      drag.ly = ev.clientY
      el.setPointerCapture(ev.pointerId)
    }
    function onMove(ev: PointerEvent) {
      if (!drag.on) return
      drag.x += (ev.clientX - drag.lx) * 0.005
      drag.y += (ev.clientY - drag.ly) * 0.003
      drag.lx = ev.clientX
      drag.ly = ev.clientY
    }
    function onUp() {
      drag.on = false
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)

    let resizeAt = -999
    const draw = (now: number) => {
      const rt = live.current
      const w = el.clientWidth || 640
      const h = el.clientHeight || 420
      if (now - resizeAt > 240) {
        resizeAt = now
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55))
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(1, h)
        camera.updateProjectionMatrix()
        if (hold.children.length) hold.scale.setScalar(viewFit(camera, maxDim, 0.46))
      }

      const lock = rt.confidence
      const juice = rt.juice
      const youHit = rt.hitSide === 'you' ? Math.exp(-rt.hitAge * 8.2) : 0
      const pagerHit = rt.hitSide === 'pager' ? Math.exp(-rt.hitAge * 8.2) : 0
      const youScore = rt.scoreSide === 'you' ? Math.exp(-rt.scoreAge * 2.6) : 0
      const pagerScore = rt.scoreSide === 'pager' ? Math.exp(-rt.scoreAge * 2.6) : 0
      const score = Math.max(youScore, pagerScore)
      const speed = Math.min(1, ballSpeed(rt) / 1.4)
      const rally = Math.min(1, rt.rallies / 10)
      const kick = Math.abs(rt.intentY)
      const incoming = rt.ballVx > 0

      const warm = youHit * 0.72 + pagerScore * 0.85 + juice * 0.35
      const cool = pagerHit * 0.7 + youScore * 0.55
      for (const skin of skins) {
        skin.emissiveIntensity = 0.1 + lock * 0.35 + youHit * 1.15 + pagerHit * 1.15 + score * 1.4 + rally * 0.12
        skin.emissive.setRGB(0.1 + warm * 0.72 + lock * 0.18, 0.1 + juice * 0.16 + youScore * 0.22, 0.12 + cool * 0.7)
      }

      youGlow.intensity = 0.12 + youHit * 3.4 + youScore * 2.2 + (incoming ? 0 : lock * 0.35)
      pagerGlow.intensity = 0.12 + pagerHit * 3.4 + pagerScore * 2.2 + (incoming ? lock * 0.55 : 0.08)
      youGlow.position.set(-0.5, 0.12 + rt.youY * 0.18, 0.5)
      pagerGlow.position.set(0.5, 0.12 + rt.pagerY * 0.18, 0.5)

      if (field.visible) {
        for (let i = 0; i < CHANNELS; i++) {
          const left = i < CHANNELS / 2
          const bin = rt.bins[i % rt.bins.length] ?? 0
          const hemi = left ? youHit : pagerHit
          const fire = bin * (0.28 + lock * 0.45 + speed * 0.2) + hemi * 1.15 + score * 0.45
          field.getMatrixAt(i, mat4)
          dummy.position.setFromMatrixPosition(mat4)
          dummy.scale.setScalar(0.4 + fire * 2.4)
          dummy.updateMatrix()
          field.setMatrixAt(i, dummy.matrix)
        }
        field.instanceMatrix.needsUpdate = true
        mark.emissiveIntensity = 0.55 + lock * 0.9 + youHit * 2.2 + pagerHit * 2.2 + score * 1.6
      }

      const punch = 1 + youHit * 0.045 + pagerHit * 0.045 + score * 0.08 + rally * 0.012
      const squash = 1 - youHit * 0.035 + pagerHit * 0.02 - score * 0.05
      root.scale.set(punch, punch * squash, punch)
      root.position.set(rt.ballX * 0.04, rt.ballY * 0.055 + rt.intentY * 0.03, 0)

      if (!drag.on) {
        const track = rt.ballX * 0.22 + (incoming ? 0.1 : -0.06)
        drag.x += (track - drag.x) * 0.045
        drag.y += (rt.ballY * 0.08 + kick * 0.02 - drag.y) * 0.04
      }
      root.rotation.y = drag.x
      root.rotation.x = Math.max(-0.32, Math.min(0.32, drag.y))
      renderer.render(scene, camera)
    }

    const stop = loopWhileVisible(el, draw, 16)
    return () => {
      gone = true
      stop()
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      geo.dispose()
      mark.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [live])

  return <div className="model-stage" ref={host} />
}
