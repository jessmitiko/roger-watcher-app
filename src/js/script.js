/* global jQuery: false, window: false, document: false, chrome: false */

let last = {};
const socket = io();
const RW = (function() {
  // const info = chrome.runtime.getManifest();
  const notifier = jQuery({});
  const panel = jQuery('#panel');
  const busca = jQuery('#busca');
  const requiredParameters = {
    all: ['v', 't', 'cid', 'tid'],
    social: ['sn', 'sa', 'st'],
    transaction: ['ti'],
    item: ['ti', 'in']
  };
  const modules = {
    google_analytics: {
      template: jQuery(jQuery('#template-universal').html()),
      parseByType(type, params) {
        if (!requiredParameters[type]) return [];

        return requiredParameters[type].filter(
          param => params[param] === undefined
        );
      },
      appendNewHit(obj) {
        const [ tds ] = (obj.parameters.ga_event_id && obj.parameters.ga_screen_id && obj.parameters.t == 'firebase') ? document.querySelectorAll(`td[title='${last.ga_event_id}']`) : [undefined];
        
        if(tds && obj.parameters.ga_screen_id	== last.ga_screen_id	&& obj.parameters.ga_event_id == last.ga_event_id) {
          const table = tds.parentNode.parentNode;
          // const parameters = JSON.stringify(obj.parameters).replace(/("ga_event_origin"|"ga_event_name"|"ga_group_name"|"ga_list_length"|"ga_screen_class"|"ga_screen_id"|"ga_screen"|"ga_event_id")(.*?),|,"t":".*"/g, '');
          const parameters = JSON.stringify(obj.parameters).replace(/"ga_(.*?),|,"t":".*"/g, '');
          const text = objectToRows(JSON.parse(parameters));

          table.innerHTML += text;
        } else {
          const clone = this.template.clone();
          const content = decode(obj.content);
          clone.addClass(obj.parameters.t).data('qs', obj.queryString);
          clone.find('.label').addClass(obj.status);
          clone.find('.content').attr('title', content).text(content);
          clone.find('table.queryString').html(objectToRows(obj.parameters));
          panel.append(clone);
          if (RW.autoscroll) clone.get(0).scrollIntoView({ behavior: 'smooth' });
        }

        if(obj.parameters.t == 'firebase') last = JSON.parse(obj.queryString);
      },
      handler(params) {
        let content = '';
        switch (params.t) {
          case 'firebase':
            if(params.ga_event_name && params.screenName) {
              if(params.ga_event_name.length > 0 && params.screenName.length > 0) {
                content = (params.ga_event_name.startsWith('menu_')) ? [params.eventCategory, params.eventAction, params.eventLabel].map(val => val || '<empty>').join(' > ') : `${params.screenName} ${params.ga_event_name}`;
              }
            } else if(params.ga_event_name && params.ga_screen) {
              if(params.ga_event_name.length > 0 && params.ga_screen.length > 0) {
                content = (params.ga_event_name.startsWith('menu_')) ? [params.eventCategory, params.eventAction, params.eventLabel].map(val => val || '<empty>').join(' > ') : `${params.ga_screen} ${params.ga_event_name}`;
              }
            }
            break;
          case 'pageview':
            if (params.dp) {
              content = (params.dh || '') + params.dp;
            } else {
              content = params.dl;
            }
            // color = "#3333CC";
            break;
          case 'event':
            content = [params.ec, params.ea, params.el].map(val => val || '<empty>').join(' > ');
            // color = "#33CC33";
            break;
          case 'transaction':
            content = `Trans: ${params.ti} > ${params.tr}`;
            // color = "#CC33CC";
            break;
          case 'item':
            content = `${params.iv} > ${params.in}`;
            // color = "#CC3380";
            break;
          case 'screenview':
            content = params.cd;
            // color = "#CC3380";
            break;
          case 'social':
            content = `${params.sn} > ${params.sa}`;
            // color = "#33CCCC";
            break;
          case 'timing':
            content = [params.utc, params.utv, params.utl, params.utt].join(
              ' > '
            );
            // color = "#A66F00";
            break;
        }

        const errors = [
          ['all', params],
          [params.t, params]
        ]
          .map(this.parseByType)
          .filter(error => error.length > 0);

        // if(params.t == 'firebase') {
        //  if(lastParams.length < 1) lastParams = JSON.stringify(params);

        //  if(lastParams.includes(params.ga_event_id) && lastParams.includes(params.ga_screen_id)) {
        //    var currenty = JSON.stringify(params).replace('{', '');
        //    lastParams += lastParams.replace('}', ',') + currenty;
        //  } else {
        //    lastParams = JSON.stringify(params);
        //  }
        // }
        
        this.appendNewHit({
          parameters: params,
          queryString: JSON.stringify(params),
          status: errors.length ? 'error' : 'ok',
          content
        });

        publish('newhit', params);

        if (panel.hasClass('filtrado') && !panel.hasClass(params.t)) {
          panel.find();
        }
      }
    },
    firebase_analytics: {
      handler(params) {
        modules.google_analytics.handler({
          ...params,
          t: 'firebase'
        });
      }
    }
  };

  function clear() {
    jQuery('.track').remove();
    busca.val('');
  }

  function publish(type, data) {
    notifier.trigger(type, data);
  }

  function subscribe(type, func) {
    notifier.on(type, func);
  }

  function queryToObject(url = '') {
    if (url.startsWith('?')) url = url.slice(1);

    return url.split('&').reduce((acc, next) => {
      const [key, ...val] = next.split('=');
      acc[key] = val.join('=');
      return acc;
    }, {});
  }

  function objectToQuery(obj) {
    return Object.keys(obj)
      .reduce((acc, key) => acc.concat(`${key}=${escape(obj[key])}`), [])
      .join('&');
  }

  function objectToRows(obj) {
    const metadata = window.metadata.universal_analytics;
    const html = Object.keys(obj)
      .filter(key => !key.startsWith('_'))
      .map(key => {
        const keyName = decode(metadata[key] ? metadata[key].name : key);
        const value = decode(obj[key]);
        return `<td class="key" title="${key}">${keyName}</td>
					<td class="value" title="${value}">${value}</td>`;
      });

    return html.length ? '<tr>' + html.join('</tr><tr>') + '</tr>' : '';
  }

  function decode(str) {
    try {
      return decodeURIComponent(str);
    } catch ($$e) {
      return unescape(str);
    }
  }

  function encode(str) {
    try {
      return encodeURIComponent(str);
    } catch ($$e) {
      return escape(str);
    }
  }
  function init({ tool, data }) {
    if (modules[tool]) modules[tool].handler(data);
  }

  return {
    init,
    busca,
    panel,
    clear,
    autoscroll: true,
    util: {
      queryToObject,
      objectToQuery,
      pub: publish,
      sub: subscribe
    }
  };
})();

socket.on('hit sent', msg => {  
  RW.init(msg);
  // only treat enhanced-ecommerce hits por hora
  // if(msg.data.ec == 'enhanced-ecommerce') socket.emit('hit attached', msg);
});
