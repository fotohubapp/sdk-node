/* eslint-disable */
/**
 * GENERATED FILE - do not edit by hand. Run `npm run gen:ops` after the operation
 * catalog changes. Source: timeline-service catalog/ops.schema.json.
 */

export type Note = string | null;
/**
 * @minItems 1
 * @maxItems 40
 */
export type Ops = [
  (
    | InsertClip
    | DeleteClips
    | MoveClips
    | TrimClip
    | RollEdit
    | SlipClip
    | SplitClips
    | JoinClips
    | InsertGap
    | SetClipProps
    | AddTrack
    | RemoveTrack
    | MoveTrack
    | SetTrackProps
    | SetProjectProps
    | AddMarker
    | UpdateMarker
    | RemoveMarker
    | AddTransition
    | UpdateTransition
    | RemoveTransition
    | DetachAudio
  ),
  ...(
    | InsertClip
    | DeleteClips
    | MoveClips
    | TrimClip
    | RollEdit
    | SlipClip
    | SplitClips
    | JoinClips
    | InsertGap
    | SetClipProps
    | AddTrack
    | RemoveTrack
    | MoveTrack
    | SetTrackProps
    | SetProjectProps
    | AddMarker
    | UpdateMarker
    | RemoveMarker
    | AddTransition
    | UpdateTransition
    | RemoveTransition
    | DetachAudio
  )[]
];
export type Start = number | null;
export type Trackid = string | null;
export type Clip = NewVideoAudioClip | NewImageClip | NewTextClip | NewGapClip;
export type Assetid = string;
export type Autoedit = string | null;
export type Duration = number;
export type Name = string | null;
export type Duration1 = number;
export type Type =
  | "none"
  | "fade"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "scale"
  | "bounce"
  | "typewriter"
  | "blur"
  | "rotate"
  | "zoom"
  | "pan";
export type Bgcolor = string | null;
export type Color = string | null;
export type Brightness = number | null;
export type Contrast = number | null;
export type Exposure = number | null;
export type Gamma = number | null;
export type Hue = number | null;
export type Saturation = number | null;
export type Sharpen = number | null;
export type Temperature = number | null;
export type Vignette = number | null;
export type H = number;
export type W = number;
export type X = number;
export type Y = number;
export type Duckamount = number | null;
export type Duckundervoice = boolean | null;
export type Fadein = number | null;
export type Fadeout = number | null;
export type Fillcolor = string | null;
export type Fillgradient = string | null;
export type Filterpreset = string | null;
export type Fitmode = ("fit" | "fill" | "crop") | null;
export type Fontfamily = string | null;
export type Fontsize = number | null;
export type Isreversed = boolean | null;
export type Keyframes = Keyframe[] | null;
export type Autoedit1 = string | null;
export type Easing = "linear" | "easeIn" | "easeOut" | "easeInOut";
export type Id = string;
export type Prop =
  | "x"
  | "y"
  | "scale"
  | "rotation"
  | "opacity"
  | "volume"
  | "cropX"
  | "cropY"
  | "cropW"
  | "cropH"
  | "maskCenterX"
  | "maskCenterY"
  | "maskWidth"
  | "maskHeight"
  | "colorBrightness"
  | "colorContrast";
export type Time = number;
export type Value = number;
export type Muted = boolean | null;
export type Name1 = string | null;
export type Opacity = number | null;
export type Overlayborderradius = number | null;
export type Overlayshape = ("rectangle" | "circle" | "rounded") | null;
export type X1 = number;
export type Y1 = number;
export type Speed = number | null;
export type Text = string | null;
export type Align = ("left" | "center" | "right") | null;
export type Backgroundcolor = string | null;
export type Bold = boolean | null;
export type Color1 = string | null;
export type Fontfamily1 = string | null;
export type Fontsize1 = number | null;
export type Fontweight = string | number | null;
export type Italic = boolean | null;
export type Letterspacing = number | null;
export type Lineheight = number | null;
export type Opacity1 = number | null;
export type Shadow = boolean | null;
export type Strokecolor = string | null;
export type Strokewidth = number | null;
export type Textshadow = string | null;
export type Underline = boolean | null;
export type Rotation = number;
export type Scale = number;
export type Scaley = number | null;
export type X2 = number;
export type Y2 = number;
export type Duration2 = number;
export type Type1 =
  | "none"
  | "fade"
  | "cross-dissolve"
  | "slide-left"
  | "slide-right"
  | "wipe"
  | "zoom"
  | "blur"
  | "wipe-left"
  | "wipe-up"
  | "wipe-down"
  | "iris"
  | "dip-to-black";
export type Volume = number | null;
export type Words = Word[] | null;
export type End = number;
export type Start1 = number;
export type Text1 = string;
export type Sourcein = number | null;
export type Speed1 = number | null;
export type Type2 = "video" | "audio";
export type Assetid1 = string;
export type Autoedit2 = string | null;
export type Duration3 = number;
export type Name2 = string | null;
export type Type3 = "image";
export type Autoedit3 = string | null;
export type Duration4 = number;
export type Preset = ("plain" | "karaoke" | "box" | "outline") | null;
export type Text2 = string;
export type Type4 = "text";
export type Duration5 = number;
export type Type5 = "gap";
export type Op = "insertClip";
export type Ref = string | null;
export type Ripple = boolean | null;
/**
 * @minItems 1
 * @maxItems 40
 */
export type Ids = [string, ...string[]];
export type Leavegap = boolean | null;
export type Op1 = "deleteClips";
export type Ripple1 = boolean | null;
export type Delta = number;
/**
 * @minItems 1
 * @maxItems 40
 */
export type Ids1 = [string, ...string[]];
export type Op2 = "moveClips";
export type Targettrackid = string | null;
export type Delta1 = number;
export type Edge = "start" | "end";
export type Id1 = string;
export type Op3 = "trimClip";
export type Ripple2 = boolean | null;
export type Delta2 = number;
export type Leftid = string;
export type Op4 = "rollEdit";
export type Delta3 = number;
export type Id2 = string;
export type Op5 = "slipClip";
export type At = number;
/**
 * @minItems 1
 * @maxItems 40
 */
export type Ids2 = [string, ...string[]];
export type Op6 = "splitClips";
/**
 * @minItems 2
 * @maxItems 40
 */
export type Ids3 = [string, string, ...string[]];
export type Op7 = "joinClips";
export type At1 = number;
export type Duration6 = number;
export type Op8 = "insertGap";
export type Ripple3 = boolean | null;
export type Id3 = string;
export type Op9 = "setClipProps";
export type Ripple4 = boolean | null;
export type Index = number | null;
export type Kind = "main" | "overlay" | "audio";
export type Label = string | null;
export type Op10 = "addTrack";
export type Id4 = string;
export type Op11 = "removeTrack";
export type Id5 = string;
export type Op12 = "moveTrack";
export type Toindex = number;
export type Id6 = string;
export type Op13 = "setTrackProps";
export type Height = number | null;
export type Label1 = string | null;
export type Locked = boolean | null;
export type Muted1 = boolean | null;
export type Solo = boolean | null;
export type Visible = boolean | null;
export type Volume1 = number | null;
export type Aspectratio = ("16:9" | "9:16" | "1:1" | "4:5" | "4:3") | null;
export type Backgroundcolor1 = string | null;
export type Fps = (24 | 25 | 30 | 50 | 60) | null;
export type Op14 = "setProjectProps";
export type Title = string | null;
export type Color2 = string;
export type Label2 = string;
export type Time1 = number;
export type Op15 = "addMarker";
export type Id7 = string;
export type Op16 = "updateMarker";
export type Color3 = string | null;
export type Label3 = string | null;
export type Time2 = number | null;
export type Id8 = string;
export type Op17 = "removeMarker";
export type Alignment = ("center" | "before" | "after") | null;
export type Duration7 = number;
export type Fromclipid = string;
export type Op18 = "addTransition";
export type Toclipid = string;
export type Trackid1 = string;
export type Type6 =
  | "none"
  | "fade"
  | "cross-dissolve"
  | "slide-left"
  | "slide-right"
  | "wipe"
  | "zoom"
  | "blur"
  | "wipe-left"
  | "wipe-up"
  | "wipe-down"
  | "iris"
  | "dip-to-black";
export type Id9 = string;
export type Op19 = "updateTransition";
export type Alignment1 = ("center" | "before" | "after") | null;
export type Duration8 = number | null;
export type Type7 =
  | (
      | "none"
      | "fade"
      | "cross-dissolve"
      | "slide-left"
      | "slide-right"
      | "wipe"
      | "zoom"
      | "blur"
      | "wipe-left"
      | "wipe-up"
      | "wipe-down"
      | "iris"
      | "dip-to-black"
    )
  | null;
export type Id10 = string;
export type Op20 = "removeTransition";
export type Id11 = string;
export type Op21 = "detachAudio";
export type Ref1 = string | null;
export type Tracklabel = string | null;

export interface ApplyEditInput {
  note?: Note;
  ops: Ops;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "InsertClip".
 */
export interface InsertClip {
  at: InsertAt;
  clip: Clip;
  op: Op;
  ref?: Ref;
  ripple?: Ripple;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "InsertAt".
 */
export interface InsertAt {
  start?: Start;
  trackId?: Trackid;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "NewVideoAudioClip".
 */
export interface NewVideoAudioClip {
  assetId: Assetid;
  autoEdit?: Autoedit;
  duration: Duration;
  name?: Name;
  props?: AllowedClipPatch | null;
  sourceIn?: Sourcein;
  speed?: Speed1;
  type: Type2;
}
/**
 * Exactly the TS whitelist. Extended by the transitions task (2026-09-20): transitionIn/Out (a single
 * clip's OWN edge decoration) are now settable, same as every other visual field. chromaKey, visualizer,
 * audioEffects, audioEnhanced, isWatermark and every source/structural field are STILL absent on purpose;
 * extra='forbid' rejects them. Cross-clip BoundaryTransitions (between two clips, not on one) are a separate
 * mechanism — see AddTransition/UpdateTransition/RemoveTransition below.
 *
 * `keyframes` joined the whitelist with the look-profile task (2026-09-20) and is the one field here that is
 * NOT for the model to author: it exists so `cut_engine` can put a real camera move (Ken Burns — keyframed
 * `scale`/`x`/`y`) on a shot. It is in the whitelist rather than special-cased because `applyPlan.pickAllowed`
 * IS the whitelist: a key outside it is stripped silently, which would have meant a montage whose camera move
 * vanished on the way to the browser with nothing reported. `export_safe.keyframe_verdict` refuses the props
 * the export loses (scale/rotation on a TEXT clip) before any batch is sent, and the prompt tells the model
 * not to write them by hand. `audioEffects.normalize` (loudnorm) deliberately did NOT come along: nothing in
 * the auto-editor needs it, and every widening of this list widens what a model can put on a user's timeline.
 *
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "AllowedClipPatch".
 */
export interface AllowedClipPatch {
  animationIn?: ClipAnimation | null;
  animationOut?: ClipAnimation | null;
  bgColor?: Bgcolor;
  color?: Color;
  colorCorrection?: ColorCorrection | null;
  cropRegion?: CropRegion | null;
  duckAmount?: Duckamount;
  duckUnderVoice?: Duckundervoice;
  fadeIn?: Fadein;
  fadeOut?: Fadeout;
  fillColor?: Fillcolor;
  fillGradient?: Fillgradient;
  filterPreset?: Filterpreset;
  fitMode?: Fitmode;
  fontFamily?: Fontfamily;
  fontSize?: Fontsize;
  isReversed?: Isreversed;
  keyframes?: Keyframes;
  muted?: Muted;
  name?: Name1;
  opacity?: Opacity;
  overlayBorderRadius?: Overlayborderradius;
  overlayShape?: Overlayshape;
  position?: Position | null;
  speed?: Speed;
  text?: Text;
  textStyle?: TextStyle | null;
  transform?: Transform | null;
  transitionIn?: ClipTransition | null;
  transitionOut?: ClipTransition | null;
  volume?: Volume;
  words?: Words;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "ClipAnimation".
 */
export interface ClipAnimation {
  duration: Duration1;
  type: Type;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "ColorCorrection".
 */
export interface ColorCorrection {
  brightness?: Brightness;
  contrast?: Contrast;
  exposure?: Exposure;
  gamma?: Gamma;
  hue?: Hue;
  saturation?: Saturation;
  sharpen?: Sharpen;
  temperature?: Temperature;
  vignette?: Vignette;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "CropRegion".
 */
export interface CropRegion {
  h: H;
  w: W;
  x: X;
  y: Y;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "Keyframe".
 */
export interface Keyframe {
  autoEdit?: Autoedit1;
  easing?: Easing;
  id: Id;
  prop: Prop;
  time: Time;
  value: Value;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "Position".
 */
export interface Position {
  x: X1;
  y: Y1;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "TextStyle".
 */
export interface TextStyle {
  align?: Align;
  backgroundColor?: Backgroundcolor;
  bold?: Bold;
  color?: Color1;
  fontFamily?: Fontfamily1;
  fontSize?: Fontsize1;
  fontWeight?: Fontweight;
  italic?: Italic;
  letterSpacing?: Letterspacing;
  lineHeight?: Lineheight;
  opacity?: Opacity1;
  shadow?: Shadow;
  strokeColor?: Strokecolor;
  strokeWidth?: Strokewidth;
  textShadow?: Textshadow;
  underline?: Underline;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "Transform".
 */
export interface Transform {
  rotation: Rotation;
  scale: Scale;
  scaleY?: Scaley;
  x: X2;
  y: Y2;
}
/**
 * A single clip's OWN edge decoration (`transitionIn`/`transitionOut` on `AllowedClipPatch`) —
 * not the same thing as a `BoundaryTransition` between two clips (see `AddTransition` below).
 *
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "ClipTransition".
 */
export interface ClipTransition {
  duration: Duration2;
  type: Type1;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "Word".
 */
export interface Word {
  end: End;
  start: Start1;
  text: Text1;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "NewImageClip".
 */
export interface NewImageClip {
  assetId: Assetid1;
  autoEdit?: Autoedit2;
  duration: Duration3;
  name?: Name2;
  props?: AllowedClipPatch | null;
  type: Type3;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "NewTextClip".
 */
export interface NewTextClip {
  autoEdit?: Autoedit3;
  duration: Duration4;
  preset?: Preset;
  props?: AllowedClipPatch | null;
  text: Text2;
  type: Type4;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "NewGapClip".
 */
export interface NewGapClip {
  duration: Duration5;
  type: Type5;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "DeleteClips".
 */
export interface DeleteClips {
  ids: Ids;
  leaveGap?: Leavegap;
  op: Op1;
  ripple?: Ripple1;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "MoveClips".
 */
export interface MoveClips {
  delta: Delta;
  ids: Ids1;
  op: Op2;
  targetTrackId?: Targettrackid;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "TrimClip".
 */
export interface TrimClip {
  delta: Delta1;
  edge: Edge;
  id: Id1;
  op: Op3;
  ripple?: Ripple2;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "RollEdit".
 */
export interface RollEdit {
  delta: Delta2;
  leftId: Leftid;
  op: Op4;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "SlipClip".
 */
export interface SlipClip {
  delta: Delta3;
  id: Id2;
  op: Op5;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "SplitClips".
 */
export interface SplitClips {
  at: At;
  ids: Ids2;
  op: Op6;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "JoinClips".
 */
export interface JoinClips {
  ids: Ids3;
  op: Op7;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "InsertGap".
 */
export interface InsertGap {
  at: At1;
  duration: Duration6;
  op: Op8;
  ripple?: Ripple3;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "SetClipProps".
 */
export interface SetClipProps {
  id: Id3;
  op: Op9;
  patch: AllowedClipPatch;
  ripple?: Ripple4;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "AddTrack".
 */
export interface AddTrack {
  index?: Index;
  kind: Kind;
  label?: Label;
  op: Op10;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "RemoveTrack".
 */
export interface RemoveTrack {
  id: Id4;
  op: Op11;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "MoveTrack".
 */
export interface MoveTrack {
  id: Id5;
  op: Op12;
  toIndex: Toindex;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "SetTrackProps".
 */
export interface SetTrackProps {
  id: Id6;
  op: Op13;
  patch: TrackPatch;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "TrackPatch".
 */
export interface TrackPatch {
  height?: Height;
  label?: Label1;
  locked?: Locked;
  muted?: Muted1;
  solo?: Solo;
  visible?: Visible;
  volume?: Volume1;
}
/**
 * Twin of ops/project.ts's `setProjectProps` (line 48): a patch on `doc.project` (ProjectMeta), not on
 * any clip. Plan 2026-09-21 §6 P1 item 1 -- until this op existed, "zrob z tego wersje 9:16" had no tool
 * to call at all, even though the TS operation was already live and wired to TopBar's title edit and
 * CanvasDrawer's aspect/fps/colour controls.
 *
 * Every field is independently optional; an all-absent patch is the op's own no-op (it already returns
 * `ok(doc, [])` unconditionally for one, so there is nothing extra to guard here). `id`/`createdAt`/
 * `updatedAt` are not fields on this model at all, mirroring the op itself stripping them from the patch
 * before touching anything -- the director cannot rewrite a project's identity or timestamps through this
 * door any more than a human can through CanvasDrawer/TopBar.
 *
 * `width`/`height` are DELIBERATELY not fields here, and that is not an oversight this docstring is
 * covering for: `editorLite/export/dimensions.ts`'s `exportDimensions()` is what actually decides the
 * pixels a render comes out at, computed from `resolution` x `aspectRatio` at export time, and it never
 * reads `doc.project.width`/`height` at all. Those two columns only size the BROWSER'S PREVIEW canvas.
 * A model-settable pixel override would therefore be a lever with nothing behind it -- state the model
 * could set, see accepted, and watch have zero effect on the file the user downloads. Routing the model
 * through `aspectRatio` instead (the exact same five presets CanvasDrawer's SegmentedControl offers a
 * human) means every width/height this op can ever produce already passed through `aspectDimensions()`'s
 * own table in ops/project.ts: never zero, negative, odd (H.264 chroma subsampling needs even dimensions,
 * the same fact editorLite/export/dimensions.ts's `exportDimensions()` comments) or absurdly large --
 * because there is no numeric dimension input for the model to get a bad value from in the first place.
 *
 * Changing `aspectRatio` reshapes the canvas but touches NO clip: `setProjectProps` only ever patches
 * `doc.project`. Every existing clip keeps re-fitting itself to the new canvas through its OWN `fitMode`
 * at render time (drawMath.ts's `geometryFor`/`fitRect` read canvasW/canvasH live, never a size baked
 * into the clip) -- `fitMode: 'fit'` letterboxes (nothing cropped, but bars appear), `'fill'`/`'crop'`
 * cover the new canvas by scaling and cropping around DEAD CENTRE. Cover-fit has no idea where the
 * subject is: a clip framed off-centre for 16:9, or one with a custom `cropRegion` chosen to keep a
 * subject inside a 16:9 frame, can lose that subject once the same region is cover-fit into a 9:16
 * canvas. This op cannot fix that -- there is no subject-aware recrop anywhere in this engine -- so the
 * director must tell the user an aspect change may leave existing footage mis-framed and worth a look,
 * never claim the reframe happens automatically.
 *
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "SetProjectProps".
 */
export interface SetProjectProps {
  aspectRatio?: Aspectratio;
  backgroundColor?: Backgroundcolor1;
  fps?: Fps;
  op: Op14;
  title?: Title;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "AddMarker".
 */
export interface AddMarker {
  marker: MarkerInput;
  op: Op15;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "MarkerInput".
 */
export interface MarkerInput {
  color: Color2;
  label: Label2;
  time: Time1;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "UpdateMarker".
 */
export interface UpdateMarker {
  id: Id7;
  op: Op16;
  patch: MarkerPatch;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "MarkerPatch".
 */
export interface MarkerPatch {
  color?: Color3;
  label?: Label3;
  time?: Time2;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "RemoveMarker".
 */
export interface RemoveMarker {
  id: Id8;
  op: Op17;
}
/**
 * Boundary transition between two adjacent clips. `alignment` is optional: omitted, the client
 * dispatcher tries center -> before -> after and, only when none of the three has a frame of handle
 * anywhere, falls back to BORROWING (shortening the outgoing clip to create a tail handle) — see
 * `src/lib/videoEditor/assistant/applyPlan.ts`'s `addTransition` dispatch, the TS twin of this model.
 * `duration` is a request, not a guarantee: the client clamps it down to whatever the chosen
 * alignment/path can actually hold.
 *
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "AddTransition".
 */
export interface AddTransition {
  alignment?: Alignment;
  duration: Duration7;
  fromClipId: Fromclipid;
  op: Op18;
  toClipId: Toclipid;
  trackId: Trackid1;
  type: Type6;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "UpdateTransition".
 */
export interface UpdateTransition {
  id: Id9;
  op: Op19;
  patch: TransitionPatch;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "TransitionPatch".
 */
export interface TransitionPatch {
  alignment?: Alignment1;
  duration?: Duration8;
  type?: Type7;
}
/**
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "RemoveTransition".
 */
export interface RemoveTransition {
  id: Id10;
  op: Op20;
}
/**
 * Split a video clip's audio onto its own audio track (`ops/detachAudio.ts`): the video clip
 * keeps its picture, muted, and a new linked audio clip carries the same source window at the same
 * `start`. Added 2026-09-26 for `auto_edit`'s real ducking (spec follow-up): the editor's dynamic
 * ducking (`duckUnderVoice`/`duckAmount` on `AllowedClipPatch`) only fires against an AUDIO-typed
 * lane whose LABEL contains a voice word (`findVoiceLane` / `render_engine._find_voice_track`), and
 * an auto-edit's speech starts out on the MAIN VIDEO track, which that lookup skips outright. `ref`
 * names the newly created AUDIO clip the same way `insertClip.ref` names its own new clip — a later
 * op in the same batch may address it as `$ref:<name>`. `trackLabel` is applied ONLY when the split
 * creates a fresh audio track (an existing free one may be reused instead, keeping its own label).
 *
 * This interface was referenced by `ApplyEditInput`'s JSON-Schema
 * via the `definition` "DetachAudio".
 */
export interface DetachAudio {
  id: Id11;
  op: Op21;
  ref?: Ref1;
  trackLabel?: Tracklabel;
}

/** One timeline operation, as accepted by {@link FotoHub.applyVideoOps}. */
export type OpIntent = ApplyEditInput["ops"][number];
