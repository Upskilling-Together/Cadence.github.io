/**
 * PostHog wiring for the static (GitHub Pages) build of ABC Tutoring.
 *
 * Official PostHog install snippet, unmodified, from
 * https://posthog.com/docs/libraries/js — no server needed on this page,
 * so once this is hosted anywhere with normal internet access (GitHub
 * Pages included), posthog.capture() calls reach PostHog directly.
 */
(function () {
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init('phc_AWVBjKcPBbz8EeGPc5zkeukVVApoSM4FnXHs3oDnFDjz', {
    api_host: 'https://us.i.posthog.com',
    defaults: '2026-05-30',
    // This project defaults to only creating a person profile for
    // identified users. This prototype never calls posthog.identify(),
    // so without this override every real visitor would count toward
    // event totals (pageviews, etc.) but never toward "Active users" or
    // any other person-based insight, which would look broken to Dana.
    person_profiles: 'always',
  });

  // Local ring buffer just to power the "Live activity" panel on Dana's
  // dashboard within THIS browser session — separate from PostHog itself.
  window.__recentEvents = [];

  window.track = function track(event, properties, role) {
    const props = Object.assign({}, properties || {}, { $role: role || 'parent' });
    try { posthog.capture(event, props); } catch (e) { console.warn('[posthog] capture failed', e); }
    window.__recentEvents.unshift({ event, role: role || 'parent', ts: Date.now() });
    window.__recentEvents = window.__recentEvents.slice(0, 30);
    console.log('%c[telemetry]', 'color:#1F8A70;font-weight:bold', event, props);
  };
})();
