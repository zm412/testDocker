var send_var = false;

document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () =>  compose_email());

  // By default, load the inbox
  send_var ? load_mailbox('sent') : load_mailbox('inbox')
});

function compose_email(objData={'recipients': '', 'subject': '', 'body': ''}){
  // Show compose view and hide other views
  change_class('#compose-view');
    document.querySelector('#compose-recipients').value = objData.recipients;
    document.querySelector('#compose-subject').value = objData.subject;
    document.querySelector('#compose-body').value = objData.body;
  // Clear out composition fields
  document.querySelector('#send_butt').addEventListener('click', (e) => {
      e.preventDefault();
      send_letter() 
    });
}

function load_mailbox(mailbox) {
  change_class('#emails-view');
  // Show the mailbox and hide other views
  //index_view()
  // Show the mailbox name
  if(mailbox != 'sent') send_var = false;
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
  mailbox_view(mailbox);
}


function mailbox_view(mailbox){
  fetch('/emails/'+mailbox, {
      method: 'GET',
      mode: 'same-origin',
  })
  .then(response => response.json())
  .then(result => {
    result.forEach((item, index, arr) => add_email(item, mailbox))
  })
  .catch(err => console.log(err, 'error'))
}


function add_email(content_obj, mailbox){

  let linkEmailFunc = (e) => {
      e.preventDefault();
      localStorage.setItem('mailbox', mailbox);
      show_email_func(content_obj.id, mailbox);
      fetch_put(content_obj.id, {'read': true});
    }

  let par = document.querySelector('#emails-view');
  let new_line = createEl('div', par, { 'class':"p-4 mb-3 border show_elem row" }) ;
  let inner = mailbox != 'sent' ? content_obj.sender : content_obj.recipients;
  let linkSender = createEl('a', new_line, {'href': `#`, 'class': 'col-sm-3 overhid'}, inner) ;
  let new_a = createEl('a', new_line, { 'href': '#' , 'class': 'col-sm-5 overhid'}, content_obj.subject) ;
  let timeShortFormat = content_obj.timestamp.split(' ');
  let timeEmail = createEl('span', new_line, {'class': 'col-sm-2'}, `${timeShortFormat[0]} ${timeShortFormat[1]}`) ;
  new_a.onclick = linkEmailFunc;
  linkSender.onclick = linkEmailFunc;

  if(mailbox == 'inbox'){
    if(content_obj.read) new_line.classList.add("ifRead")

    let archive_butt = createEl('button', new_line,{
                                            'data-act': 'to_archive',
                                            'data-elemid': content_obj.id,
                                            'class': 'col-sm-2 btn btn-outline-secondary'
                                            }, 'To archive');
    archive_butt.onclick = button_action;
  }
}

function createEl(tag, par, objAttr={}, inner=''){
  new_el = document.createElement(tag);
  for(key in objAttr){
    new_el.setAttribute(key, objAttr[key]);
  }
  new_el.innerHTML = inner;
  par.append(new_el);
  return new_el;
}

function fetch_put(id, data){
  fetch('/emails/'+id, {
    method: 'PUT',
    body: JSON.stringify(data)
  })     
    .then(result => {
      if(data.hasOwnProperty('archived')) load_mailbox('inbox')
    })
    .catch(err => console.log(err, 'error'))
}

function button_action(e){
  let archived = e.target.dataset.act == 'to_archive';
  fetch_put(e.target.dataset.elemid, {'archived': archived});
}

function change_class(blockElemId){
  let list = ['#show_email', '#emails-view', '#compose-view'];
  let blockElem = document.querySelector(blockElemId);
  list.forEach(item => {
      let classElem = item == blockElemId ? 'block' : 'none';
      let itemElem = document.querySelector(item);
      itemElem.style.display = classElem;
  })
  return blockElem;
}

function show_email_func(email_id, mailbox){
  let show_box = change_class('#show_email');
  show_box.innerHTML = '';
  history.pushState({'mailbox': mailbox}, "", `${mailbox}${email_id}`);
  localStorage.setItem('mailbox', mailbox)

  window.onpopstate = function(e){
    load_mailbox(localStorage.getItem('mailbox'))
  }

  fetch( `emails/${ email_id }`)
    .then(response => response.json())
    .then(email => {
      let show_elem_str = `
          <div> <span><strong>From: </strong>${email.sender} </span> </div>
          <div> <span><strong>To: </strong>${email.recipients.join(', ')} </span> </div>
          <div> <span><strong>Subject: </strong>${email.subject} </span> </div>
          <div> <span><strong>Time: </strong>${email.timestamp} </span> </div>
          <br>
          <div> <p>${email.body} </p> </div>
      `;

      show_elem_str = mailbox != 'sent' ?  
          show_elem_str + `
            <button href='{% url 'index" %}" id='send_answ' class='btn btn-outline-secondary'>Reply</button>
            <br><br>
          ` 
        : show_elem_str;

      show_elem_str = email.archived ?  
          show_elem_str + ` 
          <div> 
            <button data-elemid="${email.id}" data-act='out_archive' class='btn btn-outline-secondary' id="out_arch">
                Unarchive 
            </button> 
          </div>
        ` 
        : show_elem_str;
      show_box.insertAdjacentHTML('afterbegin', show_elem_str);
      if(email.archived)  document.querySelector('#out_arch').onclick = button_action 
      if(document.querySelector('#send_answ')) document.querySelector('#send_answ').onclick = (e) => send_answer(email)
    })
}

function send_answer(email){
  let objData = {
    recipients: email.sender,
    subject: email.subject.slice(0,3) != 'Re:' ? "Re: " + email.subject : email.subject,
    body: `On ${email.timestamp} ${email.sender} wrote: ${email.body}\r\r`
  }
  compose_email(objData);
}

function send_letter(){
  const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
  let bodyJSON = JSON.stringify({
            recipients: document.querySelector('#compose-recipients').value,
            subject: document.querySelector('#compose-subject').value,
            body: document.querySelector('#compose-body').value
      })
  const request = new Request( '/emails', {headers: {'X-CSRFToken': csrftoken}});
  fetch(request, {
      method: 'POST',
      mode: 'same-origin', // Do not send CSRF token to another domain.
      body: bodyJSON
  })
  .then(response => response.json())
  .then(result => {
    send_var = true;
    load_mailbox('sent');
  })
  .catch(err => console.log(err, 'error'))
}


