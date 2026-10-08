import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

// Entry point for the Remotion CLI. Use it through npm run remotion:studio (edit the composition) and
// npm run film:render (render the site's film files into public/media/showcase).
registerRoot(RemotionRoot);
