(function () {
  const ids = window.__ids;
  const desk = document.getElementById('desk');
  const defaults = { refreshFrequency: 1000, initialState: { output: '' },
    updateState: (e) => ({ output: e.output, error: e.error }), render: (p) => html('div', null, p.output) };
  window.__errors = [];
  ids.forEach((id) => {
    let impl;
    try { impl = Object.assign({}, defaults, require(id)); } catch (e) { window.__errors.push(id + ': ' + e.message); return; }
    const el = document.createElement('div');
    el.id = id; el.className = 'widget' + (impl.className ? ' ' + emotionCss(impl.className) : '');
    desk.appendChild(el);
    let state = impl.initialState;
    const draw = () => { try { ReactDOM.render(impl.render(state, dispatch), el); } catch (e) { window.__errors.push(id + ' render: ' + e.message); } };
    function dispatch(ev) { try { state = impl.updateState(ev, state); } catch (e) { window.__errors.push(id + ' update: ' + e.message); } draw(); }
    draw();
    const runOnce = () => {
      if (!impl.command) return;
      const p = typeof impl.command === 'function' ? Promise.resolve(impl.command.apply(impl, [dispatch])) : window.__mockRun(impl.command);
      p.then((output) => dispatch({ type: 'UB/COMMAND_RAN', output })).catch((error) => { window.__errors.push(id + ' command: ' + error); dispatch({ type: 'UB/COMMAND_RAN', error }); });
    };
    runOnce();
    if (/system/.test(id)) setTimeout(runOnce, 1200);
  });
})();
