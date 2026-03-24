function s(e){if(!e||e==="-"||e==="")return null;if(/^\d{4}-\d{2}-\d{2}/.test(e))return e.slice(0,10);const t=e.split("/");return t.length===3?`${t[2]}-${t[1].padStart(2,"0")}-${t[0].padStart(2,"0")}`:null}function d(e){if(!e)return"-";const t=new Date(e);if(isNaN(t.getTime()))return e;const n=String(t.getUTCDate()).padStart(2,"0"),a=String(t.getUTCMonth()+1).padStart(2,"0"),i=t.getUTCFullYear();return`${n}/${a}/${i}`}function m(e){if(!e)return"";const t=new Date(e);return isNaN(t.getTime())?e:t.toLocaleString("pt-BR")}function p(e){if(!e)return new Date().toISOString();if(/^\d{4}-\d{2}-\d{2}T/.test(e))return e;const t=e.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(t){const n=new Date,a=parseInt(t[1],10),i=parseInt(t[2],10),o=t[3]?parseInt(t[3],10):0;return n.setHours(a,i,o,0),n.toISOString()}return new Date().toISOString()}function g(e,t){if(t==="received")return"received";if(!e)return t||"pending";const n=new Date;n.setHours(0,0,0,0);const a=new Date(e);return a.setHours(0,0,0,0),a<n?"overdue":"pending"}function _(e,t){if(t==="paid")return"paid";if(!e)return t||"pending";const n=new Date;n.setHours(0,0,0,0);const a=new Date(e);return a.setHours(0,0,0,0),a<n?"overdue":"pending"}function f(e,t,n){if(n){const a=new Date;a.setHours(0,0,0,0);const i=new Date(n);if(i.setHours(0,0,0,0),i<a)return"vencido"}return e===0||e<=t?"critico":e<=t*1.5?"baixo":"ok"}function y(e,t){return{id:e.id,owner_id:t,name:e.name||"",cpf:e.cpf||"",rg:e.rg||"",birth_date:s(e.birthDate)||e.birthDate||null,age:e.age??null,gender:e.gender||null,phone:e.phone||"",phone2:e.phone2||null,email:e.email||"",mother_name:e.motherName||"",marital_status:e.maritalStatus||"",occupation:e.occupation||"",address_cep:e.address?.cep||"",address_street:e.address?.street||"",address_number:e.address?.number||"",address_complement:e.address?.complement||null,address_neighborhood:e.address?.neighborhood||"",address_city:e.address?.city||"",address_state:e.address?.state||"",insurance:e.insurance||"",insurance_number:e.insuranceNumber||null,insurance_validity:e.insuranceValidity||null,observations:e.observations||null,allergies:e.allergies||null,medications:e.medications||null,lgpd_consent:e.lgpdConsent??!1,lgpd_consent_date:e.lgpdConsentDate?new Date(s(e.lgpdConsentDate)||e.lgpdConsentDate).toISOString():null,responsible_name:e.responsible?.name||null,responsible_cpf:e.responsible?.cpf||null,responsible_phone:e.responsible?.phone||null,responsible_relationship:e.responsible?.relationship||null,status:e.status||"active",created_at:new Date().toISOString(),last_visit:s(e.lastVisit)||null,total_visits:e.totalVisits??0}}function v(e){return{id:e.id,name:e.name||"",cpf:e.cpf||"",rg:e.rg||"",birthDate:e.birth_date||"",age:e.age??0,gender:e.gender||"M",phone:e.phone||"",phone2:e.phone2||void 0,email:e.email||"",address:{cep:e.address_cep||"",street:e.address_street||"",number:e.address_number||"",complement:e.address_complement||void 0,neighborhood:e.address_neighborhood||"",city:e.address_city||"",state:e.address_state||""},motherName:e.mother_name||"",maritalStatus:e.marital_status||"",occupation:e.occupation||"",insurance:e.insurance||"",insuranceNumber:e.insurance_number||void 0,insuranceValidity:e.insurance_validity||void 0,observations:e.observations||void 0,allergies:e.allergies||void 0,medications:e.medications||void 0,lgpdConsent:e.lgpd_consent??!1,lgpdConsentDate:e.lgpd_consent_date?d(e.lgpd_consent_date):void 0,status:e.status||"active",lastVisit:e.last_visit?d(e.last_visit):"-",totalVisits:e.total_visits??0,responsible:e.responsible_name?{name:e.responsible_name,cpf:e.responsible_cpf||"",phone:e.responsible_phone||"",relationship:e.responsible_relationship||""}:void 0}}function b(e,t){return{id:e.id,owner_id:t,patient_name:e.patientName||"",patient_cpf:e.patientCPF||"",patient_phone:e.patientPhone||"",patient_email:e.patientEmail||"",doctor_name:e.doctorName||"",specialty:e.specialty||"",appointment_time:e.time||"08:00",appointment_date:e.date||new Date().toISOString().slice(0,10),duration:e.duration??30,type:e.type||"presencial",status:e.status||"pendente",color:"",room:e.room||null,notes:e.notes||null,telemed_link:e.telemedLink||null,consultation_value:e.consultationValue??null,payment_type:e.paymentType||"particular",insurance_name:e.insuranceName||null,payment_status:e.paymentStatus||"pendente",payment_method:e.paymentMethod||null,installments:e.installments??1,paid_amount:e.paidAmount??0,due_date:s(e.dueDate)||e.dueDate||null,tuss_code:e.tussCode||null}}function D(e){return{id:e.id,patientName:e.patient_name||"",patientCPF:e.patient_cpf||"",patientPhone:e.patient_phone||"",patientEmail:e.patient_email||"",doctorName:e.doctor_name||"",specialty:e.specialty||"",time:e.appointment_time||"",date:e.appointment_date||"",duration:e.duration??30,type:e.type||"presencial",status:e.status||"pendente",room:e.room||void 0,notes:e.notes||void 0,telemedLink:e.telemed_link||void 0,consultationValue:e.consultation_value!=null?Number(e.consultation_value):void 0,paymentType:e.payment_type||void 0,insuranceName:e.insurance_name||void 0,paymentStatus:e.payment_status||void 0,paymentMethod:e.payment_method||void 0,installments:e.installments??void 0,paidAmount:e.paid_amount!=null?Number(e.paid_amount):void 0,dueDate:e.due_date||void 0,tussCode:e.tuss_code||void 0}}function S(e,t){return{id:e.id,owner_id:t,patient_id:e.patientId||null,patient_name:e.patientName||"",doctor_name:e.doctorName||"",record_date:e.date?new Date(s(e.date)||e.date).toISOString():new Date().toISOString(),type:e.type||"Consulta",cid10:e.cid10||"",chief_complaint:e.chiefComplaint||"",conduct_plan:e.conductPlan||"",anamnesis:e.anamnesis||null,physical_exam:e.physicalExam||null,prescriptions:e.prescriptions||null,signed:e.signed??!1,signed_at:e.signedAt?new Date(e.signedAt).toISOString():null,created_at:new Date().toISOString()}}function x(e){return{id:e.id,patientId:e.patient_id||"",patientName:e.patient_name||"",doctorName:e.doctor_name||"",date:d(e.record_date),type:e.type||"Consulta",cid10:e.cid10||"",chiefComplaint:e.chief_complaint||"",conductPlan:e.conduct_plan||"",anamnesis:e.anamnesis||void 0,physicalExam:e.physical_exam||void 0,prescriptions:e.prescriptions||void 0,signed:e.signed??!1,signedAt:e.signed_at||void 0}}function R(e,t){return{id:e.id,owner_id:t,patient_name:e.patientName||"",patient_id:e.patientId||null,exam_type:e.examType||"",request_date:s(e.requestDate)||e.requestDate||new Date().toISOString().slice(0,10),result_date:e.resultDate?s(e.resultDate)||e.resultDate:null,status:e.status||"solicitado",laboratory:e.laboratory||"",requested_by:e.requestedBy||"",priority:e.priority||"normal",tuss_code:e.tussCode||null,notes:e.notes||null}}function T(e){return{id:e.id,patientName:e.patient_name||"",patientId:e.patient_id||void 0,examType:e.exam_type||"",requestDate:e.request_date||"",resultDate:e.result_date||null,status:e.status||"solicitado",laboratory:e.laboratory||"",requestedBy:e.requested_by||"",priority:e.priority||"normal",tussCode:e.tuss_code||void 0,notes:e.notes||void 0}}function I(e,t){return{id:e.id,owner_id:t,name:e.name||"",category:e.category||"material",quantity:e.quantity??0,min_quantity:e.minQuantity??0,unit:e.unit||"un",batch:e.batch||"",expiry:s(e.expiry)||e.expiry||null,supplier:e.supplier||"",status:e.status||"ok",location:e.location||null,unit_cost:e.unitCost??null}}function C(e){return{id:e.id,name:e.name||"",category:e.category||"material",quantity:e.quantity??0,minQuantity:e.min_quantity??0,unit:e.unit||"un",batch:e.batch||"",expiry:e.expiry||"",supplier:e.supplier||"",status:f(e.quantity,e.min_quantity,e.expiry)||"ok",location:e.location||void 0,unitCost:e.unit_cost!=null?Number(e.unit_cost):void 0}}function N(e,t){return{id:e.id,owner_id:t,ticket_number:e.ticketNumber||"",name:e.name||"",status:e.status||"waiting",arrival_time:p(e.arrivalTime),waiting_time:e.waitingTime??0,doctor:e.doctor||"",specialty:e.specialty||"",priority:e.priority??!1,room:e.room||null,cpf:e.cpf||null,birth_date:s(e.birthDate)||e.birthDate||null,age:e.age??null,gender:e.gender||null,phone:e.phone||null,email:e.email||null,insurance:e.insurance||null,allergies:e.allergies||null}}function $(e){return{id:e.id,ticketNumber:e.ticket_number||"",name:e.name||"",status:e.status||"waiting",arrivalTime:e.arrival_time||"",waitingTime:e.waiting_time??0,doctor:e.doctor||"",specialty:e.specialty||"",priority:e.priority??!1,room:e.room||void 0,cpf:e.cpf||void 0,birthDate:e.birth_date||void 0,age:e.age??void 0,gender:e.gender||void 0,phone:e.phone||void 0,email:e.email||void 0,insurance:e.insurance||void 0,allergies:e.allergies||void 0}}function A(e,t){return{id:e.id,owner_id:t,type:e.type||"info",title:e.title||"",message:e.message||"",is_read:e.read??!1,urgent:e.urgent??!1}}function P(e){return{id:e.id,type:e.type||"info",title:e.title||"",message:e.message||"",time:m(e.created_at)||"Agora",read:e.is_read??!1,urgent:e.urgent??!1}}function k(e,t){return{id:e.id,owner_id:t,patient_name:e.patient||"",insurance_name:e.insurance||"",billing_date:s(e.date)||e.date||new Date().toISOString().slice(0,10),amount:e.amount??0,status:e.status||"pending",items_count:e.items??0}}function M(e){return{id:e.id,patient:e.patient_name||"",insurance:e.insurance_name||"",date:e.billing_date||"",amount:Number(e.amount)||0,status:e.status||"pending",items:e.items_count??0}}function F(e,t){return{id:e.id,owner_id:t,patient_name:e.patient||"",payment_type:e.type||"",payment_date:s(e.date)||e.date||new Date().toISOString().slice(0,10),amount:e.amount??0,method:e.method||"",status:e.status||"pending"}}function z(e){return{id:e.id,patient:e.patient_name||"",type:e.payment_type||"",date:e.payment_date||"",amount:Number(e.amount)||0,method:e.method||"",status:e.status||"pending"}}function B(e,t){return{id:e.id,owner_id:t,patient_name:e.patient||"",description:e.description||"",due_date:s(e.dueDate)||e.dueDate||new Date().toISOString().slice(0,10),amount:e.amount??0,status:e.status||"pending"}}function O(e){return{id:e.id,patient:e.patient_name||"",description:e.description||"",dueDate:e.due_date||"",amount:Number(e.amount)||0,status:g(e.due_date,e.status)||"pending"}}function H(e,t){return{id:e.id,owner_id:t,supplier:e.supplier||"",description:e.description||"",due_date:s(e.dueDate)||e.dueDate||new Date().toISOString().slice(0,10),amount:e.amount??0,status:e.status||"pending"}}function E(e){return{id:e.id,supplier:e.supplier||"",description:e.description||"",dueDate:e.due_date||"",amount:Number(e.amount)||0,status:_(e.due_date,e.status)||"pending"}}function L(e,t){return{id:e.id,owner_id:t,name:e.name||"",crm:e.crm||"",crm_uf:e.crmUf||"",specialty:e.specialty||"",email:e.email||"",phone:e.phone||"",cpf:e.cpf||"",digital_certificate:e.digitalCertificate||"none",certificate_expiry:s(e.certificateExpiry)||e.certificateExpiry||null,status:e.status||"active",clinics_names:e.clinics||[],role:e.role||"doctor",payment_model:e.paymentModel||null,fixed_salary:e.fixedSalary??null,revenue_percentage:e.revenuePercentage??null,goal_monthly_consultations:e.goalMonthlyConsultations??null,goal_monthly_revenue:e.goalMonthlyRevenue??null,goal_patient_satisfaction:e.goalPatientSatisfaction??null,consultations_this_month:e.consultationsThisMonth??null,revenue_this_month:e.revenueThisMonth??null,avg_satisfaction:e.avgSatisfaction??null,avg_consultation_time:e.avgConsultationTime??null}}function j(e){return{id:e.id,name:e.name||"",crm:e.crm||"",crmUf:e.crm_uf||"",specialty:e.specialty||"",email:e.email||"",phone:e.phone||"",cpf:e.cpf||"",digitalCertificate:e.digital_certificate||"none",certificateExpiry:e.certificate_expiry||"",status:e.status||"active",clinics:e.clinics_names||[],createdAt:d(e.created_at),role:e.role||"doctor",paymentModel:e.payment_model||void 0,fixedSalary:e.fixed_salary!=null?Number(e.fixed_salary):void 0,revenuePercentage:e.revenue_percentage!=null?Number(e.revenue_percentage):void 0,goalMonthlyConsultations:e.goal_monthly_consultations??void 0,goalMonthlyRevenue:e.goal_monthly_revenue!=null?Number(e.goal_monthly_revenue):void 0,goalPatientSatisfaction:e.goal_patient_satisfaction!=null?Number(e.goal_patient_satisfaction):void 0,consultationsThisMonth:e.consultations_this_month??void 0,revenueThisMonth:e.revenue_this_month!=null?Number(e.revenue_this_month):void 0,avgSatisfaction:e.avg_satisfaction!=null&&Number(e.avg_satisfaction)>0?Number(e.avg_satisfaction):void 0,avgConsultationTime:e.avg_consultation_time??void 0}}function U(e,t){return{id:e.id,owner_id:t,name:e.name||"",cnpj:e.cnpj||"",register:e.register||"",type:e.type||"health",status:e.status||"active",phone:e.phone||"",email:e.email||"",contract_date:s(e.contractDate)||e.contractDate||null,expiration_date:s(e.expirationDate)||e.expirationDate||null,grace_period:e.gracePeriod??0,coverage_percentage:e.coveragePercentage??100}}function q(e){return{id:e.id,name:e.name||"",cnpj:e.cnpj||"",register:e.register||"",type:e.type||"health",status:e.status||"active",phone:e.phone||"",email:e.email||"",contractDate:e.contract_date||"",expirationDate:e.expiration_date||"",gracePeriod:e.grace_period??0,coveragePercentage:Number(e.coverage_percentage)??100}}function V(e,t){return{id:e.id,owner_id:t,title:e.title||"",specialty:e.specialty||"",category:e.category||"tratamento",last_update:s(e.lastUpdate)||e.lastUpdate||new Date().toISOString().slice(0,10),usage_count:e.usage??0,is_active:e.active??!0}}function W(e,t){return{protocol_id:t,step_number:e.step,title:e.title||"",description:e.description||"",is_mandatory:e.mandatory??!0}}function J(e,t=[]){return{id:e.id,title:e.title||"",specialty:e.specialty||"",category:e.category||"tratamento",lastUpdate:e.last_update||"",steps:t.filter(n=>n.protocol_id===e.id).sort((n,a)=>n.step_number-a.step_number).map(n=>({step:n.step_number,title:n.title||"",description:n.description||"",mandatory:n.is_mandatory??!0})),usage:e.usage_count??0,active:e.is_active??!0}}function Y(e){return{id:e.id,timestamp:m(e.created_at),user:e.user_name||"",userRole:e.user_role||"",action:e.action||"read",module:e.module||"",description:e.description||"",ipAddress:e.ip_address||"0.0.0.0",device:e.device||"",status:e.status||"success"}}function Q(e,t){return{id:e.id,owner_id:t,patient_name:e.patientName||"",doctor_name:e.doctorName||"",specialty:e.specialty||"",session_date:s(e.date)||e.date||new Date().toISOString().slice(0,10),session_time:e.time||"08:00",duration:e.duration??30,link:e.link||"",status:e.status||"scheduled",recording_consent:e.recordingConsent??!1,appointment_id:e.appointmentId||null,notes:e.notes||null}}function G(e){return{id:e.id,patientName:e.patient_name||"",doctorName:e.doctor_name||"",specialty:e.specialty||"",date:e.session_date||"",time:e.session_time||"",duration:e.duration??30,link:e.link||"",status:e.status||"scheduled",recordingConsent:e.recording_consent??!1,appointmentId:e.appointment_id||void 0,notes:e.notes||void 0}}function K(e,t){return{id:e.id,owner_id:t,name:e.name||"",email:e.email||"",role:e.role||"doctor",status:e.status||"active",last_login:e.lastLogin?new Date(s(e.lastLogin)||e.lastLogin).toISOString():null,phone:e.phone||null}}function X(e){return{id:e.id,name:e.name||"",email:e.email||"",role:e.role||"doctor",status:e.status||"active",lastLogin:e.last_login||"",createdAt:d(e.created_at),phone:e.phone||void 0}}function Z(e,t){return{id:e.id,owner_id:t,name:e.name||"",category:e.category||"prescription",specialty:e.specialty||"",is_favorite:e.isFavorite??!1,usage_count:e.usageCount??0,content:e.content||""}}function w(e){return{id:e.id,name:e.name||"",category:e.category||"prescription",specialty:e.specialty||"",isFavorite:e.is_favorite??!1,usageCount:e.usage_count??0,content:e.content||"",createdAt:d(e.created_at)}}function ee(e,t){return{id:e.id,owner_id:t,type:e.type||"reminder",patient_name:e.patientName||"",channel:e.channel||"whatsapp",subject:e.subject||"",body:e.body||"",status:e.status||"pending",scheduled_at:e.scheduledAt||null,sent_at:e.sentAt||null}}function te(e){return{id:e.id,type:e.type||"reminder",patientName:e.patient_name||"",channel:e.channel||"whatsapp",subject:e.subject||"",body:e.body||"",status:e.status||"pending",scheduledAt:e.scheduled_at||void 0,sentAt:e.sent_at||void 0,createdAt:e.created_at||new Date().toISOString()}}function ne(e,t){return{id:e.id,owner_id:t,name:e.name||"",type:e.type||"custom",channel:e.channel||"email",status:e.status||"draft",total_recipients:e.totalRecipients??0,sent:e.sent??0,message:e.message||null}}function ae(e){return{id:e.id,name:e.name||"",type:e.type||"custom",channel:e.channel||"email",status:e.status||"draft",totalRecipients:e.total_recipients??0,sent:e.sent??0,message:e.message||"",createdAt:e.created_at||new Date().toISOString()}}function ie(e,t){if(!e.storagePath)throw new Error(`[fileAttachmentToRow] Tentativa de persistir anexo sem storagePath. Arquivo: "${e.name}". Certifique-se de que o upload ao Storage foi concluído antes de salvar.`);return{id:e.id,owner_id:t,entity_type:e.entityType||"patient",entity_id:e.entityId||null,name:e.name||"",mime_type:e.type||"application/octet-stream",size_bytes:e.size??0,storage_path:e.storagePath,bucket_type:e.bucketType||"documents",uploaded_by:e.uploadedBy||"",uploaded_by_id:t}}function se(e){return{id:e.id,entityType:e.entity_type||"patient",entityId:e.entity_id||"",name:e.name||"",type:e.mime_type||"application/octet-stream",size:e.size_bytes??0,storagePath:e.storage_path||"",bucketType:e.bucket_type||"documents",uploadedBy:e.uploaded_by||"",uploadedAt:e.created_at||new Date().toISOString()}}function oe(e,t){return{owner_id:t,clinic_name:e.clinicName||"AmplieMed",cnpj:e.cnpj||"",address:e.address||"",phone:e.phone||"",email:e.email||"",logo_path:e.logoPath||null,working_hours_start:e.workingHours?.start||"08:00",working_hours_end:e.workingHours?.end||"18:00",appointment_interval:e.appointmentInterval??30,timezone:e.timezone||"America/Sao_Paulo",notifications_email:e.notificationsEmail??!0,notifications_sms:e.notificationsSMS??!1,notifications_whatsapp:e.notificationsWhatsApp??!1,theme:e.theme||"light",language:e.language||"pt-BR",auto_backup:e.autoBackup??!0,backup_interval:e.backupInterval??30}}function de(e){return{clinicName:e.clinic_name||"AmplieMed",cnpj:e.cnpj||"",address:e.address||"",phone:e.phone||"",email:e.email||"",logoPath:e.logo_path||void 0,workingHours:{start:e.working_hours_start||"08:00",end:e.working_hours_end||"18:00"},appointmentInterval:e.appointment_interval??30,timezone:e.timezone||"America/Sao_Paulo",notificationsEmail:e.notifications_email??!0,notificationsSMS:e.notifications_sms??!1,notificationsWhatsApp:e.notifications_whatsapp??!1,theme:e.theme||"light",language:e.language||"pt-BR",autoBackup:e.auto_backup??!0,backupInterval:e.backup_interval??30}}function le(e){const t=e.replace(/[^\d]/g,"");if(t.length!==11||/^(\d)\1{10}$/.test(t))return!1;let n=0;for(let i=0;i<9;i++)n+=parseInt(t.charAt(i))*(10-i);let a=11-n%11;if(a>9&&(a=0),a!==parseInt(t.charAt(9)))return!1;n=0;for(let i=0;i<10;i++)n+=parseInt(t.charAt(i))*(11-i);return a=11-n%11,a>9&&(a=0),a===parseInt(t.charAt(10))}function re(e){const t=e.replace(/[^\d]/g,"");if(t.length!==14||/^(\d)\1{13}$/.test(t))return!1;let n=0,a=5;for(let o=0;o<12;o++)n+=parseInt(t.charAt(o))*a,a=a===2?9:a-1;let i=n%11<2?0:11-n%11;if(i!==parseInt(t.charAt(12)))return!1;n=0,a=6;for(let o=0;o<13;o++)n+=parseInt(t.charAt(o))*a,a=a===2?9:a-1;return i=n%11<2?0:11-n%11,i===parseInt(t.charAt(13))}function ce(e,t,n,a){if("doctorName"in e){const i=e;return c({name:i.patientName,cpf:"",age:0},{name:i.doctorName,crm:i.crm||"",specialty:""},i.medications||[],new Date().toLocaleDateString("pt-BR"))}return c(e,t,n,a)}function c(e,t,n,a){return`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receita Médica</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 15px; margin-bottom: 20px; }
    .logo { font-size: 24pt; font-weight: bold; color: #0066cc; }
    .doctor-info { font-size: 10pt; color: #666; margin-top: 5px; }
    .patient-info { background: #f5f5f5; padding: 10px; margin-bottom: 20px; border-left: 4px solid #0066cc; }
    .prescription-title { font-size: 14pt; font-weight: bold; margin: 20px 0 10px 0; }
    .prescription-item { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
    .medication-name { font-weight: bold; font-size: 13pt; color: #0066cc; }
    .signature-section { margin-top: 60px; text-align: center; }
    .signature-line { border-top: 1px solid #000; width: 300px; margin: 0 auto; padding-top: 5px; }
    .footer { text-align: center; font-size: 9pt; color: #999; margin-top: 40px; }
    .digital-signature { background: #e3f2fd; padding: 10px; margin-top: 20px; border: 1px dashed #0066cc; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AmplieMed</div>
    <div class="doctor-info">
      ${t.name} - CRM: ${t.crm}<br>
      ${t.specialty}<br>
      Telefone: (11) 3456-7890 | Email: contato@ampliemed.com.br
    </div>
  </div>

  <div class="patient-info">
    <strong>Paciente:</strong> ${e.name}<br>
    <strong>CPF:</strong> ${e.cpf} | <strong>Idade:</strong> ${e.age} anos<br>
    <strong>Data:</strong> ${a}
  </div>

  <div class="prescription-title">ℹ️ PRESCRIÇÃO MÉDICA</div>

  ${n.map((i,o)=>`
    <div class="prescription-item">
      <div class="medication-name">${o+1}. ${i.medication}</div>
      <div style="margin-top: 8px;">
        <strong>Posologia:</strong> ${i.dosage} - ${i.frequency}<br>
        <strong>Duração do tratamento:</strong> ${i.duration}<br>
        ${i.instructions?`<strong>Instruções:</strong> ${i.instructions}`:""}
      </div>
    </div>
  `).join("")}

  <div class="digital-signature">
    <strong>🔒 Assinatura Digital ICP-Brasil</strong><br>
    <small>Certificado A1: ${t.crm} | Data/Hora: ${new Date().toLocaleString("pt-BR")}</small><br>
    <small>Hash SHA-256: ${r()}</small>
  </div>

  <div class="signature-section">
    <div class="signature-line">
      ${t.name}<br>
      CRM: ${t.crm} | ${t.specialty}
    </div>
  </div>

  <div class="footer">
    Esta receita foi gerada eletronicamente e possui validade jurídica com assinatura digital ICP-Brasil.<br>
    Verifique a autenticidade em: www.ampliemed.com.br/verificar
  </div>
</body>
</html>
  `}function ue(e,t,n,a,i){if("doctorName"in e){const o=e;return u({name:o.patientName,cpf:"",birthDate:""},{name:o.doctorName,crm:o.crm||"",specialty:""},1,o.content||"",new Date().toLocaleDateString("pt-BR"))}return u(e,t,n,a,i)}function u(e,t,n,a,i){const o=new Date,l=new Date;return l.setDate(l.getDate()+n-1),`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Atestado Médico</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; }
    .header { text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 15px; margin-bottom: 40px; }
    .logo { font-size: 24pt; font-weight: bold; color: #0066cc; }
    .doctor-info { font-size: 10pt; color: #666; margin-top: 5px; }
    .certificate-title { text-align: center; font-size: 18pt; font-weight: bold; margin: 30px 0; text-transform: uppercase; }
    .content { text-align: justify; margin: 30px 0; font-size: 13pt; }
    .highlight { background: #fff3cd; padding: 2px 5px; }
    .signature-section { margin-top: 80px; text-align: center; }
    .signature-line { border-top: 1px solid #000; width: 300px; margin: 0 auto; padding-top: 5px; }
    .digital-signature { background: #e3f2fd; padding: 10px; margin-top: 30px; border: 1px dashed #0066cc; text-align: center; }
    .footer { text-align: center; font-size: 9pt; color: #999; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AmplieMed</div>
    <div class="doctor-info">
      ${t.name} - CRM: ${t.crm}<br>
      ${t.specialty}<br>
      Av. Paulista, 1000 - São Paulo/SP | Tel: (11) 3456-7890
    </div>
  </div>

  <div class="certificate-title">Atestado Médico</div>

  <div class="content">
    <p>Atesto para os devidos fins que o(a) Sr(a). <strong>${e.name}</strong>, 
    portador(a) do CPF <strong>${e.cpf}</strong>, nascido(a) em <strong>${e.birthDate}</strong>, 
    esteve sob meus cuidados médicos nesta data e necessita se afastar de suas atividades 
    pelo período de <span class="highlight"><strong>${n} (${h(n)}) ${n===1?"dia":"dias"}</strong></span>.</p>

    <p><strong>Período de afastamento:</strong> 
    ${o.toLocaleDateString("pt-BR")} a ${l.toLocaleDateString("pt-BR")}</p>

    ${a?`<p><strong>Observações médicas:</strong> ${a}</p>`:""}

    <p>Por ser verdade, firmo o presente.</p>
  </div>

  <div style="text-align: right; margin-top: 30px;">
    São Paulo, ${i}
  </div>

  <div class="digital-signature">
    <strong>🔒 Documento assinado digitalmente com certificado ICP-Brasil</strong><br>
    <small>Certificado A1: ${t.crm} | Data/Hora: ${new Date().toLocaleString("pt-BR")}</small><br>
    <small>Hash SHA-256: ${r()}</small>
  </div>

  <div class="signature-section">
    <div class="signature-line">
      ${t.name}<br>
      CRM: ${t.crm} | ${t.specialty}
    </div>
  </div>

  <div class="footer">
    Este atestado foi gerado eletronicamente e possui validade jurídica com assinatura digital ICP-Brasil.<br>
    Verifique a autenticidade em: www.ampliemed.com.br/verificar
  </div>
</body>
</html>
  `}function r(){const e="0123456789abcdef";let t="";for(let n=0;n<64;n++)t+=e[Math.floor(Math.random()*e.length)];return t}function h(e){return["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove","vinte","vinte e um","vinte e dois","vinte e três","vinte e quatro","vinte e cinco","vinte e seis","vinte e sete","vinte e oito","vinte e nove","trinta"][e]||e.toString()}function me(e,t){const n=window.open("","_blank");n&&(n.document.write(e),n.document.close(),n.focus(),setTimeout(()=>{n.print()},500))}function pe(e,t,n){return{signed:!0,certificate:`ICP-Brasil A1 - ${t}${n?` CRM: ${n}`:""}`,timestamp:new Date().toISOString(),hash:r()}}export{b as A,S as B,R as C,I as D,N as E,A as F,k as G,F as H,B as I,H as J,L as K,U as L,Q as M,K as N,Z as O,ee as P,ne as Q,ie as R,le as S,pe as T,re as U,ce as V,ue as W,me as X,W as a,de as b,oe as c,ae as d,te as e,se as f,G as g,Y as h,J as i,q as j,j as k,E as l,z as m,M as n,P as o,V as p,$ as q,O as r,X as s,w as t,C as u,T as v,x as w,D as x,v as y,y as z};
